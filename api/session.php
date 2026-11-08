<?php
require __DIR__ . '/bootstrap.php';

start_session();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    if (empty($_SESSION['ok']) || empty($_SESSION['token'])) {
        json_out(401, ['ok' => false]);
    }
    json_out(200, ['ok' => true, 'token' => $_SESSION['token']]);
}

if ($method !== 'POST') {
    json_out(405, ['ok' => false, 'error' => 'Método no permitido']);
}

if (!same_site_request()) {
    json_out(403, ['ok' => false, 'error' => 'Origen no permitido']);
}

$body = read_json();

if (($body['action'] ?? '') === 'logout') {
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], $params['secure'], $params['httponly']);
    }
    session_destroy();
    json_out(200, ['ok' => true]);
}

if (!rate_allow('login', 8, 900)) {
    json_out(429, ['ok' => false, 'error' => 'Demasiados intentos. Espera unos minutos.']);
}

$cfg = load_config();
$hash = $cfg['password_hash'] ?? '';
$password = (string) ($body['password'] ?? '');
if ($hash === '' || !password_verify($password, $hash)) {
    json_out(401, ['ok' => false, 'error' => 'Clave incorrecta']);
}

session_regenerate_id(true);
$_SESSION['ok'] = true;
$_SESSION['token'] = bin2hex(random_bytes(32));
json_out(200, ['ok' => true, 'token' => $_SESSION['token']]);
