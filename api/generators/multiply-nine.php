<?php
function generate_multiply_nine($level) {
    $op1 = random_int(12, 45);
    
    if ($level > 1) {
        $op1 = random_int(50, 120);
    }
    
    return [
        'equation' => "$op1 × 9",
        'operands' => [$op1, 9],
        'operation' => '×'
    ];
}
