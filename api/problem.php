<?php
header('Content-Type: application/json');

function evaluateTerms(array $terms, array $operators): int {
    $result = $terms[0];
    foreach ($operators as $i => $op) {
        if ($op === '+') $result += $terms[$i + 1];
        if ($op === '-') $result -= $terms[$i + 1];
        if ($op === '*') $result *= $terms[$i + 1];
        if ($op === '/') $result /= $terms[$i + 1];
    }
    return (int)$result;
}

function approach(string $id, string $expression, array $terms, array $operators, bool $isOptimal, ?string $name, ?string $hint): array {
    return [
        'id' => $id,
        'expression' => $expression,
        'terms' => $terms,
        'operators' => $operators,
        'isOptimal' => $isOptimal,
        'name' => $name,
        'hint' => $hint
    ];
}

function validBundle(array $problem): bool {
    if (!isset($problem['answer']) || !isset($problem['approaches']) || !is_array($problem['approaches'])) {
        return false;
    }

    foreach ($problem['approaches'] as $ap) {
        if (!isset($ap['terms']) || !isset($ap['operators'])) return false;
        if (count($ap['terms']) !== count($ap['operators']) + 1) return false;
        if (evaluateTerms($ap['terms'], $ap['operators']) !== $problem['answer']) {
            return false;
        }
    }

    return true;
}

function makeSplitAdd(): array {
    while (true) {
        $a = random_int(11, 59);
        $b = random_int(11, 59);
        $answer = $a + $b;
        if ($answer < 20 || $answer > 99) continue;

        $aT = intdiv($a, 10) * 10;
        $aO = $a % 10;
        $bT = intdiv($b, 10) * 10;
        $bO = $b % 10;

        $sumT = $aT + $bT;
        $sumO = $aO + $bO;

        $roundA = (int)(round($a / 10) * 10);
        $rest = $answer - $roundA;

        $problem = [
            'module' => 'split_add',
            'question' => $a . ' + ' . $b,
            'answer' => $answer,
            'approaches' => [
                approach('A', $aT . '+' . $aO . '+' . $bT . '+' . $bO, [$aT, $aO, $bT, $bO], ['+', '+', '+'], true, 'Split & Add', 'Break both numbers into tens + ones, add each part separately'),
                approach('B', $a . '+' . $bT . '+' . $bO, [$a, $bT, $bO], ['+', '+'], false, null, null),
                approach('C', $sumT . '+' . $sumO, [$sumT, $sumO], ['+'], false, null, null),
                approach('D', $roundA . '+' . $rest, [$roundA, $rest], ['+'], false, null, null)
            ]
        ];

        if (validBundle($problem)) return $problem;
    }
}

function makeBridge10(): array {
    while (true) {
        $a = random_int(6, 9);
        $need = 10 - $a;
        $b = random_int($need + 1, 9);
        $answer = $a + $b;
        if ($answer < 11 || $answer > 19) continue;

        $rest = $b - $need;
        $dPart = $answer - 10;
        $half1 = intdiv($answer, 2);
        $half2 = $answer - $half1;

        $problem = [
            'module' => 'bridge_10',
            'question' => $a . ' + ' . $b,
            'answer' => $answer,
            'approaches' => [
                approach('A', $a . '+' . $need . '+' . $rest, [$a, $need, $rest], ['+', '+'], true, 'Bridge to 10', $a . ' needs ' . $need . ' to reach 10, then add the remaining ' . $rest),
                approach('B', $half1 . '+' . $half2, [$half1, $half2], ['+'], false, null, null),
                approach('C', $b . '+' . (10 - $b) . '+' . ($answer - 10), [$b, 10 - $b, $answer - 10], ['+', '+'], false, null, null),
                approach('D', '10+' . $dPart, [10, $dPart], ['+'], false, null, null)
            ]
        ];

        if (validBundle($problem)) return $problem;
    }
}

function makeNearDoubles(): array {
    while (true) {
        $a = random_int(5, 9);
        $b = $a + 1;
        $answer = $a + $b;
        if ($answer < 6 || $answer > 20) continue;

        $problem = [
            'module' => 'near_doubles',
            'question' => $a . ' + ' . $b,
            'answer' => $answer,
            'approaches' => [
                approach('A', $a . '+' . $a . '+1', [$a, $a, 1], ['+', '+'], true, 'Near Doubles', 'Find the nearest double, solve it, adjust by +1'),
                approach('B', $b . '+' . $b . '-1', [$b, $b, 1], ['+', '-'], false, null, null),
                approach('C', ($a - 1) . '+' . ($b + 1), [$a - 1, $b + 1], ['+'], false, null, null),
                approach('D', '10+' . ($answer - 10), [10, $answer - 10], ['+'], false, null, null)
            ]
        ];

        if (validBundle($problem)) return $problem;
    }
}

function makeRoundSolve(): array {
    while (true) {
        $tens = random_int(2, 8) * 10;
        $a = $tens + random_int(8, 9);
        $maxB = 99 - $a;
        if ($maxB < 11) continue;

        $b = random_int(11, min(29, $maxB));
        $answer = $a + $b;
        if ($answer < 20 || $answer > 99) continue;

        $roundA = intdiv($a + 5, 10) * 10;
        $adjust = $roundA - $a;
        $bT = intdiv($b, 10) * 10;
        $bO = $b % 10;
        $aT = intdiv($a, 10) * 10;
        $aO = $a % 10;
        $ansT = intdiv($answer, 10) * 10;
        $ansO = $answer % 10;

        $problem = [
            'module' => 'round_solve',
            'question' => $a . ' + ' . $b,
            'answer' => $answer,
            'approaches' => [
                approach('A', $roundA . '+' . $b . '-' . $adjust, [$roundA, $b, $adjust], ['+', '-'], true, 'Round & Solve', 'Round ugly number to nearest 10, solve, subtract the rounding'),
                approach('B', $a . '+' . $bT . '+' . $bO, [$a, $bT, $bO], ['+', '+'], false, null, null),
                approach('C', $aT . '+' . $aO . '+' . $b, [$aT, $aO, $b], ['+', '+'], false, null, null),
                approach('D', $ansT . '+' . $ansO, [$ansT, $ansO], ['+'], false, null, null)
            ]
        ];

        if (validBundle($problem)) return $problem;
    }
}

function makeSplitMultiply(): array {
    while (true) {
        $a = random_int(3, 9);
        $b = random_int(11, 19);
        $answer = $a * $b;
        if ($answer < 20 || $answer > 120) continue;

        $a10 = $a * 10;
        $aOnes = $a * ($b - 10);
        $half = intdiv($b, 2);
        $other = $b - $half;

        $problem = [
            'module' => 'split_multiply',
            'question' => $a . ' x ' . $b,
            'answer' => $answer,
            'approaches' => [
                approach('A', $a10 . '+' . $aOnes, [$a10, $aOnes], ['+'], true, 'Split to Multiply', 'Break one factor into (10 + ones), multiply each, add products'),
                approach('B', ($a * $half) . '+' . ($a * $other), [$a * $half, $a * $other], ['+'], false, null, null),
                approach('C', ($a * ($b + 1)) . '-' . $a, [$a * ($b + 1), $a], ['-'], false, null, null),
                approach('D', $answer . '+0', [$answer, 0], ['+'], false, null, null)
            ]
        ];

        if (validBundle($problem)) return $problem;
    }
}

function makeNinesTrick(): array {
    while (true) {
        $n = random_int(2, 9);
        $answer = 9 * $n;
        if ($answer < 18 || $answer > 81) continue;

        $split1 = random_int(1, $n - 1);
        $split2 = $n - $split1;
        $split3 = random_int(1, $n - 1);
        $split4 = $n - $split3;

        $problem = [
            'module' => 'nines_trick',
            'question' => '9 x ' . $n,
            'answer' => $answer,
            'approaches' => [
                approach('A', (10 * $n) . '-' . $n, [10 * $n, $n], ['-'], true, 'The 9s Trick', 'Multiply by 10, then subtract the number once'),
                approach('B', (9 * $split1) . '+' . (9 * $split2), [9 * $split1, 9 * $split2], ['+'], false, null, null),
                approach('C', (9 * $split3) . '+' . (9 * $split4), [9 * $split3, 9 * $split4], ['+'], false, null, null),
                approach('D', $answer . '+0', [$answer, 0], ['+'], false, null, null)
            ]
        ];

        if (validBundle($problem)) return $problem;
    }
}

$module = $_GET['module'] ?? '';

try {
    $problem = null;

    if ($module === 'split_add') $problem = makeSplitAdd();
    if ($module === 'bridge_10') $problem = makeBridge10();
    if ($module === 'near_doubles') $problem = makeNearDoubles();
    if ($module === 'round_solve') $problem = makeRoundSolve();
    if ($module === 'split_multiply') $problem = makeSplitMultiply();
    if ($module === 'nines_trick') $problem = makeNinesTrick();

    if ($problem === null) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid module']);
        exit;
    }

    echo json_encode($problem);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Problem generation failed']);
}
