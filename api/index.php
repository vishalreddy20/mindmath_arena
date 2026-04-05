<?php
header('Content-Type: application/json');

// Error reporting for strict development
ini_set('display_errors', 0); // Hide physical errors, output JSON only

// Absolute paths
define('BASE_DIR', __DIR__);
define('DB_PATH', BASE_DIR . '/../data/mindmath.sqlite');

try {
    // Basic DB Setup if not exist
    $pdo = new PDO('sqlite:' . DB_PATH);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Create tables if missing
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            level INTEGER DEFAULT 1,
            xp INTEGER DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS badges (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            badge_id TEXT,
            earned_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    ");
} catch(PDOException $e) {
    echo json_encode(['error' => 'Database connection failed: ' . $e->getMessage()]);
    exit;
}

require_once BASE_DIR . '/session.php';
require_once BASE_DIR . '/gamification.php';

$endpoint = $_GET['endpoint'] ?? '';

try {
    switch ($endpoint) {
        case 'login':
            $data = json_decode(file_get_contents('php://input'), true);
            $username = trim($data['username'] ?? '');
            if(empty($username)) throw new Exception("Username required");
            
            // Register or Login
            $stmt = $pdo->prepare("SELECT * FROM users WHERE username = ?");
            $stmt->execute([$username]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if(!$user) {
                $stmt = $pdo->prepare("INSERT INTO users (username, level, xp) VALUES (?, 1, 115)");
                $stmt->execute([$username]);
                $user = ['id' => $pdo->lastInsertId(), 'username' => $username, 'level' => 1, 'xp' => 115];
            }
            
            initSession($user['id'], $user['username']);
            echo json_encode(getGameState($pdo, $user['id']));
            break;
            
        case 'session':
            if(checkSession()) {
                echo json_encode(getGameState($pdo, $_SESSION['user_id']));
            } else {
                echo json_encode(['session_active' => false]);
            }
            break;
            
        case 'problem':
            if(!checkSession()) throw new Exception("Unauthorized");
            $strategy = $_GET['strategy'] ?? 'split_add';
            $map = [
                'partitioning' => 'split_add',
                'bridging' => 'bridge_10',
                'near-doubles' => 'near_doubles',
                'compensation' => 'round_solve',
                'mult-partition' => 'split_multiply',
                'multiply-nine' => 'nines_trick'
            ];
            $module = $map[$strategy] ?? $strategy;
            $_GET['module'] = $module;
            include BASE_DIR . '/problem.php';
            break;
            
        case 'complete':
            if(!checkSession()) throw new Exception("Unauthorized");
            $data = json_decode(file_get_contents('php://input'), true);
            $res = processCompletion($pdo, $_SESSION['user_id'], $data);
            echo json_encode($res);
            break;
            
        default:
            echo json_encode(['error' => 'Endpoint not found']);
            break;
    }
} catch(Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
