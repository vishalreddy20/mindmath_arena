<?php
function generate_bridging($level) {
    // We want the first operand close to a decade, and the second operand to cross it
    $firstOps = [7, 8, 9, 17, 18, 19, 27, 28, 29];
    $idx = random_int(0, count($firstOps)-1);
    $op1 = $firstOps[$idx];
    
    $distToDecade = 10 - ($op1 % 10);
    // ensure op2 is larger than the distance so it bridges
    $op2 = random_int($distToDecade + 1, $distToDecade + 6);
    
    if ($level > 1) {
        // Use bigger numbers
        $op1 = random_int(4, 8) * 10 + random_int(6, 9);
        $dist = 10 - ($op1 % 10);
        $op2 = random_int($dist + 2, $dist + 8);
    }
    
    return [
        'equation' => "$op1 + $op2",
        'operands' => [$op1, $op2],
        'operation' => '+'
    ];
}
