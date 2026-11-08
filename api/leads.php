<?php
require __DIR__ . '/bootstrap.php';

const LEAD_STATUSES = ['nuevo', 'conversacion', 'cotizado', 'ganado', 'perdido'];
const LEAD_LINES = ['modular', 'prefab'];
const LEAD_BUSCA = ['Vivienda permanente', 'Segunda vivienda o cabaña', 'Local, bodega u oficina', 'Aún no lo defino'];
const LEAD_FUENTE = ['Google', 'Instagram o Facebook', 'Recomendación', 'Letrero u obra', 'Otro'];
const LEAD_TIPO = ['Modular', 'A medida', 'Prefabricada', 'No sé aún'];
const LEAD_COMUNA = ['La Serena', 'Coquimbo', 'Peñuelas', 'Ovalle', 'Vicuña', 'Valle del Elqui', 'Limarí', 'Monte Patria', 'Illapel', 'Los Vilos', 'Pichidangui', 'Tongoy', 'Guanaqueros', 'Morrillos', 'La Higuera', 'Otra comuna'];
const LEAD_TERRENO = ['Sí, listo', 'En compra', 'Aún no'];
const LEAD_PLAZO = ['Lo antes posible', '1 a 3 meses', '3 a 6 meses', 'Solo explorando'];

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    start_session();
    require_panel();
    $result = with_leads(function ($data) {
        return ['write' => false, 'leads' => $data['leads']];
    });
    json_out(200, ['ok' => true, 'leads' => $result['leads']]);
}

if ($method !== 'POST') {
    json_out(405, ['ok' => false, 'error' => 'Método no permitido']);
}

if (!same_site_request()) {
    json_out(403, ['ok' => false, 'error' => 'Origen no permitido']);
}

$body = read_json();
$action = $body['action'] ?? '';

if ($action === 'update' || $action === 'delete') {
    start_session();
    require_panel();
    if ($action === 'delete') {
        delete_lead($body);
    }
    update_lead($body);
}

create_lead($body);

function one_of($value, $allowed) {
    return in_array($value, $allowed, true) ? $value : '';
}

function prune_old(&$leads) {
    $cut = time() - (730 * 86400);
    $leads = array_values(array_filter($leads, function ($lead) use ($cut) {
        $status = $lead['status'] ?? '';
        if ($status !== 'ganado' && $status !== 'perdido') {
            return true;
        }
        $stamp = strtotime($lead['updatedAt'] ?? $lead['createdAt'] ?? '');
        return $stamp === false || $stamp >= $cut;
    }));
}

function create_lead($body) {
    if (!rate_allow('lead', 20, 3600)) {
        json_out(429, ['ok' => false, 'error' => 'Demasiados envíos desde esta red']);
    }

    /* Misma respuesta que un envío real: no confirmamos que el campo trampa funcionó. */
    if (trim((string) ($body['website'] ?? '')) !== '') {
        json_out(200, ['ok' => true]);
    }

    $lead = normalize_public_lead($body);
    if (isset($lead['error'])) {
        json_out(400, ['ok' => false, 'error' => $lead['error']]);
    }

    $now = gmdate('c');
    $result = with_leads(function (&$data) use ($lead, $now) {
        prune_old($data['leads']);
        $match = find_recent($data['leads'], $lead['phone'], $lead['line']);
        if ($match['index'] !== null) {
            $prev = $data['leads'][$match['index']];
            $fresh = $lead;
            $fresh['id'] = $prev['id'];
            $fresh['createdAt'] = $prev['createdAt'] ?? $now;
            $fresh['status'] = $prev['status'] ?? 'nuevo';
            $fresh['note'] = $prev['note'] ?? '';
            $fresh['updatedAt'] = $now;
            if ($match['kind'] === 'again') {
                $fresh['recontacto'] = true;
                $fresh['resubmittedAt'] = $now;
                if ($fresh['status'] === 'ganado' || $fresh['status'] === 'perdido') {
                    $fresh['status'] = 'nuevo';
                }
            } else {
                $fresh['recontacto'] = !empty($prev['recontacto']);
                $fresh['resubmittedAt'] = $prev['resubmittedAt'] ?? null;
            }
            $data['leads'][$match['index']] = $fresh;
            return ['write' => true];
        }

        if (count($data['leads']) >= 3000) {
            return ['write' => false, 'error' => 'El seguimiento está lleno'];
        }

        $lead['id'] = bin2hex(random_bytes(8));
        $lead['createdAt'] = $now;
        $lead['updatedAt'] = $now;
        $lead['status'] = 'nuevo';
        $lead['note'] = '';
        $lead['recontacto'] = false;
        $lead['resubmittedAt'] = null;
        $data['leads'][] = $lead;
        return ['write' => true];
    });

    if (!empty($result['error'])) {
        json_out(503, ['ok' => false, 'error' => $result['error']]);
    }
    json_out(200, ['ok' => true]);
}

function normalize_public_lead($body) {
    $line = one_of($body['line'] ?? '', LEAD_LINES);
    $nombre = clip($body['nombre'] ?? '', 60);
    $apellido = clip($body['apellido'] ?? '', 60);
    $email = strtolower(clip($body['email'] ?? '', 120));
    $phone = preg_replace('/\D/', '', (string) ($body['phone'] ?? ''));
    $busca = one_of($body['busca'] ?? '', LEAD_BUSCA);
    $fuente = one_of($body['fuente'] ?? '', LEAD_FUENTE);
    $detalle = clip($body['detalle'] ?? '', 1200);
    $tipo = one_of($body['tipo'] ?? '', LEAD_TIPO);
    $comuna = one_of($body['comuna'] ?? '', LEAD_COMUNA);
    $terreno = one_of($body['terreno'] ?? '', LEAD_TERRENO);
    $plazo = one_of($body['plazo'] ?? '', LEAD_PLAZO);

    if ($line === '') return ['error' => 'Línea inválida'];
    if (strlen($nombre) < 2 || strlen($apellido) < 2) return ['error' => 'Nombre incompleto'];
    if (!preg_match('/^[^\s@]+@[^\s@]+\.[^\s@]+$/', $email)) return ['error' => 'Email inválido'];
    if (strlen($phone) < 8 || strlen($phone) > 15) return ['error' => 'Teléfono inválido'];
    if ($busca === '' || $fuente === '' || $tipo === '' || $comuna === '' || $terreno === '' || $plazo === '') {
        return ['error' => 'Faltan datos del proyecto'];
    }
    if (strlen($detalle) < 12) return ['error' => 'Detalle demasiado corto'];

    $page = clip($body['page'] ?? '', 180);
    if ($page !== '' && !preg_match('#^/[a-z0-9._/-]*$#i', $page)) {
        $page = '/';
    }

    return [
        'line' => $line,
        'nombre' => $nombre,
        'apellido' => $apellido,
        'email' => $email,
        'phone' => $phone,
        'busca' => $busca,
        'fuente' => $fuente,
        'detalle' => $detalle,
        'tipo' => $tipo,
        'comuna' => $comuna,
        'terreno' => $terreno,
        'plazo' => $plazo,
        'estilo' => clip($body['estilo'] ?? '', 40),
        'layoutNote' => clip($body['layoutNote'] ?? '', 500),
        'page' => $page === '' ? '/' : $page,
    ];
}

function find_recent($leads, $phone, $line) {
    $now = time();
    $found = ['index' => null, 'kind' => ''];
    foreach ($leads as $i => $lead) {
        if (($lead['phone'] ?? '') !== $phone || ($lead['line'] ?? '') !== $line) {
            continue;
        }
        $created = strtotime($lead['createdAt'] ?? '');
        $touch = strtotime($lead['resubmittedAt'] ?? $lead['updatedAt'] ?? $lead['createdAt'] ?? '');
        if ($created !== false && ($now - $created) <= 180) {
            return ['index' => $i, 'kind' => 'double'];
        }
        if ($touch !== false && ($now - $touch) <= 14 * 86400) {
            $found = ['index' => $i, 'kind' => 'again'];
        }
    }
    return $found;
}

function update_lead($body) {
    $id = clip($body['id'] ?? '', 32);
    $status = one_of($body['status'] ?? '', LEAD_STATUSES);
    if ($id === '' || $status === '') {
        json_out(400, ['ok' => false, 'error' => 'No se pudo actualizar']);
    }
    $note = clip($body['note'] ?? '', 2000);
    $now = gmdate('c');
    $result = with_leads(function (&$data) use ($id, $status, $note, $now) {
        foreach ($data['leads'] as $i => $lead) {
            if (($lead['id'] ?? '') !== $id) {
                continue;
            }
            $data['leads'][$i]['status'] = $status;
            $data['leads'][$i]['note'] = $note;
            $data['leads'][$i]['updatedAt'] = $now;
            if ($status !== 'nuevo') {
                $data['leads'][$i]['recontacto'] = false;
            }
            return ['write' => true, 'lead' => $data['leads'][$i]];
        }
        return ['write' => false, 'missing' => true];
    });
    if (!empty($result['missing'])) {
        json_out(404, ['ok' => false, 'error' => 'Ese contacto ya no está']);
    }
    json_out(200, ['ok' => true, 'lead' => $result['lead']]);
}

function delete_lead($body) {
    $id = clip($body['id'] ?? '', 32);
    if ($id === '') {
        json_out(400, ['ok' => false, 'error' => 'Falta el contacto']);
    }
    $result = with_leads(function (&$data) use ($id) {
        $before = count($data['leads']);
        $data['leads'] = array_values(array_filter($data['leads'], function ($lead) use ($id) {
            return ($lead['id'] ?? '') !== $id;
        }));
        $gone = count($data['leads']) < $before;
        return ['write' => $gone, 'missing' => !$gone];
    });
    if (!empty($result['missing'])) {
        json_out(404, ['ok' => false, 'error' => 'Ese contacto ya no está']);
    }
    json_out(200, ['ok' => true]);
}
