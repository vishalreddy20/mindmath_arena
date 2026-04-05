<?php
header('Content-Type: application/json');

$raw = file_get_contents('php://input');
$payload = json_decode($raw, true);

if (!is_array($payload)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Invalid JSON payload']);
    exit;
}

$a = $payload['a'] ?? null;
$b = $payload['b'] ?? null;
$op = $payload['op'] ?? null;
$answer = $payload['answer'] ?? null;

if (!is_numeric($a) || !is_numeric($b) || !is_string($op) || !is_numeric($answer)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Missing or invalid fields: a, b, op, answer']);
    exit;
}

$a = (float)$a;
$b = (float)$b;
$userAnswer = (float)$answer;

$expected = null;
if ($op === '+') $expected = $a + $b;
if ($op === '-') $expected = $a - $b;
if ($op === '*') $expected = $a * $b;
if ($op === '/') {
    if ($b == 0.0) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'Division by zero']);
        exit;
    }
    $expected = round($a / $b);
}

if ($expected === null) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Invalid operator']);
    exit;
}

$correct = ($userAnswer === (float)$expected);

echo json_encode([
    'ok' => true,
    'correct' => $correct,
    'expected' => (float)$expected
]);
