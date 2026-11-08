<?php
/**
 * Seguimiento comercial. El archivo de clientes vive en /data, fuera de la web.
 * La clave del panel está solo en config.php (no se versiona).
 */

ini_set('display_errors', '0');

function json_out($code, $payload) {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    header('X-Robots-Tag: noindex, nofollow');
    header('Cache-Control: no-store');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

function data_dir() {
    $dir = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'data';
    if (!is_dir($dir) && !mkdir($dir, 0775, true) && !is_dir($dir)) {
        json_out(500, ['ok' => false, 'error' => 'No se pudo preparar el almacenamiento']);
    }
    return $dir;
}

function load_config() {
    $path = __DIR__ . DIRECTORY_SEPARATOR . 'config.php';
    if (!is_file($path)) {
        json_out(500, ['ok' => false, 'error' => 'Falta la clave del panel']);
    }
    $cfg = require $path;
    return is_array($cfg) ? $cfg : [];
}

function read_json() {
    $raw = file_get_contents('php://input');
    if ($raw === false || strlen($raw) > 8192) {
        json_out(413, ['ok' => false, 'error' => 'Solicitud demasiado grande']);
    }
    if ($raw === '') {
        return [];
    }
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        json_out(400, ['ok' => false, 'error' => 'JSON inválido']);
    }
    return $data;
}

function clip($value, $max) {
    $s = trim((string) $value);
    $s = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F]/u', '', $s);
    if (function_exists('mb_strlen') && mb_strlen($s) > $max) {
        return mb_substr($s, 0, $max);
    }
    if (strlen($s) > $max) {
        return substr($s, 0, $max);
    }
    return $s;
}

function client_ip() {
    return $_SERVER['REMOTE_ADDR'] ?? '0';
}

function same_site_request() {
    $fetch = $_SERVER['HTTP_SEC_FETCH_SITE'] ?? '';
    if ($fetch === 'cross-site') {
        return false;
    }
    if ($fetch === 'same-origin' || $fetch === 'same-site') {
        return true;
    }
    $host = strtolower(preg_replace('/:\d+$/', '', $_SERVER['HTTP_HOST'] ?? ''));
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin !== '') {
        $originHost = strtolower((string) parse_url($origin, PHP_URL_HOST));
        return $originHost !== '' && $originHost === $host;
    }
    return true;
}

function start_session() {
    $dir = data_dir() . DIRECTORY_SEPARATOR . 'sessions';
    if (!is_dir($dir)) {
        mkdir($dir, 0775, true);
    }
    session_save_path($dir);
    session_name('prefab_panel');
    $https = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
    session_set_cookie_params([
        'lifetime' => 60 * 60 * 24 * 14,
        'path' => '/',
        'secure' => $https,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}

function panel_token_ok() {
    $sent = $_SERVER['HTTP_X_PANEL_TOKEN'] ?? '';
    $real = $_SESSION['token'] ?? '';
    return $real !== '' && is_string($sent) && hash_equals($real, $sent);
}

function require_panel() {
    if (empty($_SESSION['ok']) || !panel_token_ok()) {
        json_out(401, ['ok' => false, 'error' => 'No autorizado']);
    }
    if (!same_site_request()) {
        json_out(403, ['ok' => false, 'error' => 'Origen no permitido']);
    }
}

function limit_path() {
    return data_dir() . DIRECTORY_SEPARATOR . 'limits.json';
}

function rate_allow($bucket, $max, $window) {
    $path = limit_path();
    $fh = fopen($path, 'c+');
    if (!$fh) {
        return true;
    }
    flock($fh, LOCK_EX);
    $raw = stream_get_contents($fh);
    $all = json_decode($raw ?: '', true);
    if (!is_array($all)) {
        $all = [];
    }
    $now = time();
    $key = $bucket . '|' . client_ip();
    $hits = [];
    if (isset($all[$key]) && is_array($all[$key])) {
        foreach ($all[$key] as $ts) {
            if (is_int($ts) && $ts > $now - $window) {
                $hits[] = $ts;
            }
        }
    }
    $ok = count($hits) < $max;
    if ($ok) {
        $hits[] = $now;
    }
    $all[$key] = $hits;
    rewind($fh);
    ftruncate($fh, 0);
    fwrite($fh, json_encode($all));
    fflush($fh);
    flock($fh, LOCK_UN);
    fclose($fh);
    return $ok;
}

function with_leads($mutator) {
    $path = data_dir() . DIRECTORY_SEPARATOR . 'leads.json';
    $fh = fopen($path, 'c+');
    if (!$fh) {
        json_out(500, ['ok' => false, 'error' => 'No se pudo abrir el seguimiento']);
    }
    flock($fh, LOCK_EX);
    $raw = stream_get_contents($fh);
    $data = json_decode($raw ?: '', true);
    if (!is_array($data) || !isset($data['leads']) || !is_array($data['leads'])) {
        $data = ['leads' => []];
    }
    $result = $mutator($data);
    if (!empty($result['write'])) {
        $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        if ($json === false) {
            flock($fh, LOCK_UN);
            fclose($fh);
            json_out(500, ['ok' => false, 'error' => 'No se pudo guardar']);
        }
        rewind($fh);
        ftruncate($fh, 0);
        fwrite($fh, $json);
        fflush($fh);
    }
    flock($fh, LOCK_UN);
    fclose($fh);
    return $result;
}
