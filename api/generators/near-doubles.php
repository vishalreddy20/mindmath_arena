<?php
function generate_near_doubles($level) {
    $base = random_int(5, 15);
    if ($level > 1) {
        $base = random_int(20, 45);
    }
    
    // Difference of 1 or 2
    $diff = random_int(1, 2);
    $op2 = $base + $diff;
    
    // Randomize order
    if (random_int(0, 1) === 1) {
        return [
            'equation' => "$op2 + $base",
            'operands' => [$op2, $base],
            'operation' => '+'
        ];
    } else {
        return [
            'equation' => "$base + $op2",
            'operands' => [$base, $op2],
            'operation' => '+'
        ];
    }
}
