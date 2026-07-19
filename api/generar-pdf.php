<?php
/**
 * Genera PDF de presupuesto referencial vía API2PDF.
 * POST JSON con los campos del armador (cliente + selección + totales recalculados en servidor).
 */
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Método no permitido']);
    exit;
}

$configPath = __DIR__ . '/config.php';
if (!is_file($configPath)) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Falta api/config.php. Copia config.example.php.']);
    exit;
}

$config = require $configPath;
$apiKey = trim((string) ($config['api2pdf_key'] ?? ''));
$endpoint = (string) ($config['api2pdf_endpoint'] ?? 'https://v2.api2pdf.com/chrome/pdf/html');

if ($apiKey === '' || $apiKey === 'PEGAR_API_KEY_AQUI') {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'API key no configurada']);
    exit;
}

$raw = file_get_contents('php://input');
$input = json_decode($raw ?: '', true);
if (!is_array($input)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'JSON inválido']);
    exit;
}

$preciosPath = dirname(__DIR__) . '/data/precios.json';
$precios = json_decode((string) file_get_contents($preciosPath), true);
if (!is_array($precios)) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'No se pudo cargar precios']);
    exit;
}

try {
    $quote = buildQuote($input, $precios);
} catch (Throwable $e) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
    exit;
}

$html = renderPdfHtml($quote, $precios);
$payload = json_encode([
    'html' => $html,
    'fileName' => $quote['numero'] . '.pdf',
    'options' => [
        'printBackground' => true,
        'preferCSSPageSize' => true,
        'marginTop' => '12mm',
        'marginBottom' => '14mm',
        'marginLeft' => '12mm',
        'marginRight' => '12mm',
    ],
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

[$response, $status, $httpErr] = api2pdfRequest($endpoint, $apiKey, $payload);

if ($response === false) {
    http_response_code(502);
    echo json_encode(['ok' => false, 'error' => 'Error de conexión con API2PDF: ' . $httpErr]);
    exit;
}

$data = json_decode($response, true);
$fileUrl = is_array($data) ? ($data['FileUrl'] ?? $data['fileUrl'] ?? null) : null;
$success = is_array($data) && (!empty($data['Success']) || !empty($data['success']) || $fileUrl);

if (!$success || !$fileUrl) {
    http_response_code(502);
    $msg = is_array($data) ? ($data['Error'] ?? $data['error'] ?? 'Respuesta inválida de API2PDF') : 'Respuesta inválida';
    echo json_encode(['ok' => false, 'error' => $msg, 'http' => $status]);
    exit;
}

echo json_encode([
    'ok' => true,
    'pdfUrl' => $fileUrl,
    'numero' => $quote['numero'],
    'totales' => $quote['totales'],
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

/* ─── HTTP a API2PDF (curl o streams) ─── */

function api2pdfRequest(string $endpoint, string $apiKey, string $payload): array
{
    if (function_exists('curl_init')) {
        $ch = curl_init($endpoint);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => [
                'Authorization: ' . $apiKey,
                'Content-Type: application/json',
            ],
            CURLOPT_POSTFIELDS => $payload,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 60,
        ]);
        $response = curl_exec($ch);
        $err = curl_error($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if ($response === false) {
            return [false, $status, $err ?: 'curl falló'];
        }
        return [$response, $status, ''];
    }

    $ctx = stream_context_create([
        'http' => [
            'method' => 'POST',
            'header' => "Authorization: {$apiKey}\r\nContent-Type: application/json\r\n",
            'content' => $payload,
            'timeout' => 60,
            'ignore_errors' => true,
        ],
    ]);
    $response = @file_get_contents($endpoint, false, $ctx);
    $status = 0;
    if (isset($http_response_header[0]) && preg_match('/\s(\d{3})\s/', $http_response_header[0], $m)) {
        $status = (int) $m[1];
    }
    if ($response === false) {
        return [false, $status, 'file_get_contents falló (habilita curl o allow_url_fopen)'];
    }
    return [$response, $status, ''];
}

/* ─── Motor de cálculo (espejo del JS) ─── */

function buildQuote(array $input, array $precios): array
{
    $estilo = (string) ($input['estilo'] ?? '');
    $metrosKey = (string) ($input['metros'] ?? '');
    $comuna = (string) ($input['comuna'] ?? '');
    $materialidad = (string) ($input['materialidad'] ?? 'sip');
    $terminacion = (string) ($input['terminacion'] ?? 'estandar');
    $extrasIds = array_values(array_filter((array) ($input['extras'] ?? []), 'is_string'));

    $cliente = [
        'nombre' => trim((string) ($input['cliente']['nombre'] ?? '')),
        'telefono' => trim((string) ($input['cliente']['telefono'] ?? '')),
        'email' => trim((string) ($input['cliente']['email'] ?? '')),
        'notas' => trim((string) ($input['cliente']['notas'] ?? '')),
    ];

    if (!isset($precios['estilos'][$estilo])) {
        throw new InvalidArgumentException('Estilo no válido');
    }
    if (!isset($precios['metros'][$metrosKey])) {
        throw new InvalidArgumentException('Metraje no válido');
    }
    if (!isset($precios['traslado'][$comuna])) {
        throw new InvalidArgumentException('Comuna no válida');
    }
    if (!isset($precios['materialidad'][$materialidad])) {
        throw new InvalidArgumentException('Materialidad no válida');
    }
    if (!isset($precios['terminacion'][$terminacion])) {
        throw new InvalidArgumentException('Terminación no válida');
    }

    $m2 = (int) $precios['metros'][$metrosKey]['m2'];
    $estiloData = $precios['estilos'][$estilo];
    $matFactor = (float) $precios['materialidad'][$materialidad]['factor'];
    $termData = $precios['terminacion'][$terminacion];
    $traslado = $precios['traslado'][$comuna];

    $items = [];

    $base = (int) round($estiloData['clpPorM2'] * $m2 * $matFactor);
    $items[] = line('EST', 'Estructura y cerramiento — ' . $estiloData['label'] . ' (' . $m2 . ' m²)', $base);

    $term = (int) round($termData['clpPorM2'] * $m2);
    if ($term > 0) {
        $items[] = line('TER', 'Terminación ' . $termData['label'], $term);
    }

    $fun = (int) round($precios['fijos']['fundaciones']['clpPorM2'] * $m2);
    $items[] = line('FUN', $precios['fijos']['fundaciones']['nombre'], $fun);

    $mon = (int) round($precios['fijos']['montaje']['clpPorM2'] * $m2);
    $items[] = line('MON', $precios['fijos']['montaje']['nombre'], $mon);

    $items[] = line('TRA', 'Traslado e izaje — ' . $comuna . ' (' . $traslado['zona'] . ')', (int) $traslado['clp']);
    $items[] = line('ASE', $precios['fijos']['asesoria']['nombre'], (int) $precios['fijos']['asesoria']['clp']);

    $extrasMap = [];
    foreach ($precios['extras'] as $ex) {
        $extrasMap[$ex['id']] = $ex;
    }
    foreach ($extrasIds as $id) {
        if (!isset($extrasMap[$id])) {
            continue;
        }
        $ex = $extrasMap[$id];
        $items[] = line('EXT', $ex['nombre'], (int) $ex['clp']);
    }

    $neto = 0;
    foreach ($items as $it) {
        $neto += $it['total'];
    }
    $iva = (int) round($neto * (float) $precios['iva']);
    $total = $neto + $iva;

    $folio = strtoupper(substr(bin2hex(random_bytes(3)), 0, 6));
    $numero = 'PCQ-' . date('ymd') . '-' . $folio;
    $hoy = new DateTimeImmutable('now', new DateTimeZone('America/Santiago'));
    $vence = $hoy->modify('+' . (int) $precios['validezDias'] . ' days');

    return [
        'numero' => $numero,
        'fecha' => $hoy->format('d/m/Y'),
        'vence' => $vence->format('d/m/Y'),
        'cliente' => $cliente,
        'proyecto' => [
            'estilo' => $estiloData['label'],
            'm2' => $m2,
            'metrosLabel' => $precios['metros'][$metrosKey]['label'],
            'dormitorios' => $precios['metros'][$metrosKey]['dormitorios'],
            'comuna' => $comuna,
            'zona' => $traslado['zona'],
            'materialidad' => $precios['materialidad'][$materialidad]['label'],
            'terminacion' => $termData['label'],
            'terminacionIncluye' => $termData['incluye'],
        ],
        'items' => $items,
        'totales' => [
            'neto' => $neto,
            'iva' => $iva,
            'total' => $total,
            'clpPorM2' => (int) round($total / max($m2, 1)),
        ],
    ];
}

function line(string $codigo, string $nombre, int $total): array
{
    return [
        'codigo' => $codigo,
        'nombre' => $nombre,
        'total' => $total,
    ];
}

function clp(int $n): string
{
    return '$' . number_format($n, 0, ',', '.');
}

function h(string $s): string
{
    return htmlspecialchars($s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function renderPdfHtml(array $q, array $precios): string
{
    $emp = $precios['empresa'];
    $c = $q['cliente'];
    $p = $q['proyecto'];
    $t = $q['totales'];

    $rows = '';
    foreach ($q['items'] as $it) {
        $rows .= '<tr><td class="code">' . h($it['codigo']) . '</td><td>' . h($it['nombre']) . '</td><td class="num">' . clp($it['total']) . '</td></tr>';
    }

    $clienteBlock = '';
    if ($c['nombre'] !== '' || $c['telefono'] !== '' || $c['email'] !== '') {
        $clienteBlock = '<div class="box">
          <div class="box-label">Cliente</div>
          <div class="box-body">
            ' . ($c['nombre'] !== '' ? '<strong>' . h($c['nombre']) . '</strong><br>' : '') . '
            ' . ($c['telefono'] !== '' ? 'WhatsApp: ' . h($c['telefono']) . '<br>' : '') . '
            ' . ($c['email'] !== '' ? h($c['email']) : '') . '
          </div>
        </div>';
    }

    $notas = $c['notas'] !== ''
        ? '<p class="notes"><strong>Notas:</strong> ' . h($c['notas']) . '</p>'
        : '';

    return '<!DOCTYPE html>
<html lang="es-CL">
<head>
<meta charset="UTF-8" />
<title>' . h($q['numero']) . '</title>
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
    color: #0F172A;
    font-size: 11px;
    line-height: 1.45;
    background: #fff;
  }
  .sheet { padding: 0 2mm; }
  .top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 3px solid #B45309;
    padding-bottom: 14px;
    margin-bottom: 18px;
  }
  .brand-name {
    font-size: 22px;
    font-weight: 800;
    letter-spacing: -0.03em;
    margin: 0;
  }
  .brand-name span { color: #B45309; }
  .brand-sub { color: #64748B; margin-top: 4px; font-size: 10px; }
  .meta { text-align: right; }
  .doc-title {
    font-size: 13px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #B45309;
    margin: 0 0 4px;
  }
  .meta strong { font-size: 13px; }
  .grid {
    display: flex;
    gap: 12px;
    margin-bottom: 16px;
  }
  .box {
    flex: 1;
    background: #FFFBEB;
    border: 1px solid #FEF3C7;
    border-radius: 8px;
    padding: 10px 12px;
  }
  .box-muted {
    background: #F8FAFC;
    border-color: #E2E8F0;
  }
  .box-label {
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #92400E;
    font-weight: 700;
    margin-bottom: 4px;
  }
  .box-muted .box-label { color: #64748B; }
  .box-body { color: #334155; }
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 8px 0 14px;
  }
  th {
    text-align: left;
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #64748B;
    border-bottom: 1px solid #E2E8F0;
    padding: 6px 4px;
  }
  td {
    padding: 8px 4px;
    border-bottom: 1px solid #F1F5F9;
    vertical-align: top;
  }
  td.code { width: 48px; color: #94A3B8; font-size: 10px; }
  td.num, th.num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
  .totals {
    width: 260px;
    margin-left: auto;
    margin-bottom: 16px;
  }
  .totals .row {
    display: flex;
    justify-content: space-between;
    padding: 4px 0;
    color: #475569;
  }
  .totals .grand {
    margin-top: 6px;
    padding-top: 8px;
    border-top: 2px solid #0F172A;
    font-size: 15px;
    font-weight: 800;
    color: #0F172A;
  }
  .totals .grand span:last-child { color: #B45309; }
  .hint {
    font-size: 10px;
    color: #64748B;
    margin: 0 0 10px;
  }
  .notes {
    background: #F8FAFC;
    border-left: 3px solid #D97706;
    padding: 8px 10px;
    margin: 0 0 12px;
  }
  .legal {
    font-size: 9px;
    color: #94A3B8;
    border-top: 1px solid #E2E8F0;
    padding-top: 10px;
    margin-top: 8px;
  }
  .foot {
    display: flex;
    justify-content: space-between;
    margin-top: 10px;
    font-size: 9px;
    color: #64748B;
  }
</style>
</head>
<body>
<div class="sheet">
  <div class="top">
    <div>
      <p class="brand-name">Prefab<span>Coquimbo</span></p>
      <div class="brand-sub">
        ' . h($emp['giro']) . '<br>
        ' . h($emp['direccion']) . ' · ' . h($emp['web']) . '
      </div>
    </div>
    <div class="meta">
      <p class="doc-title">Presupuesto referencial</p>
      <div><strong>' . h($q['numero']) . '</strong></div>
      <div>Fecha: ' . h($q['fecha']) . '</div>
      <div>Válido hasta: ' . h($q['vence']) . '</div>
    </div>
  </div>

  <div class="grid">
    ' . $clienteBlock . '
    <div class="box box-muted">
      <div class="box-label">Proyecto</div>
      <div class="box-body">
        <strong>' . h($p['estilo']) . ' · ' . h($p['metrosLabel']) . '</strong>
        (' . h($p['dormitorios']) . ')<br>
        ' . h($p['comuna']) . ' · ' . h($p['zona']) . '<br>
        ' . h($p['materialidad']) . ' · Terminación ' . h($p['terminacion']) . '
      </div>
    </div>
  </div>

  <p class="hint">' . h($p['terminacionIncluye']) . '</p>
  ' . $notas . '

  <table>
    <thead>
      <tr>
        <th>Cód.</th>
        <th>Descripción</th>
        <th class="num">Monto (CLP)</th>
      </tr>
    </thead>
    <tbody>' . $rows . '</tbody>
  </table>

  <div class="totals">
    <div class="row"><span>Neto</span><span>' . clp($t['neto']) . '</span></div>
    <div class="row"><span>IVA 19%</span><span>' . clp($t['iva']) . '</span></div>
    <div class="row grand"><span>Total</span><span>' . clp($t['total']) . '</span></div>
    <div class="row" style="font-size:10px;margin-top:4px;"><span>Equiv. / m²</span><span>' . clp($t['clpPorM2']) . '</span></div>
  </div>

  <div class="legal">
    ' . h($precios['nota']) . '
    Valores en pesos chilenos. Estimación orientativa para conversar opciones de financiamiento familiar (crédito hipotecario, ahorro, subsidios según elegibilidad). PrefabCoquimbo asesora y cotiza; la ejecución la realiza el fabricante acordado.
  </div>

  <div class="foot">
    <div>' . h($emp['email']) . ' · WhatsApp ' . h($emp['whatsapp']) . '</div>
    <div>' . h($emp['horario']) . '</div>
  </div>
</div>
</body>
</html>';
}
