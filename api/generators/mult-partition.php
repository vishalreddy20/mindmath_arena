<?php
function generate_mult_partition($level) {
    // Generate e.g. 25 x 18, where 18 is broken into 20 - 2
    // Or 15 * 12, where 12 is broken into 10 + 2
    
    $options1 = [15, 25, 35, 45];
    $idx = random_int(0, count($options1)-1);
    $op1 = $options1[$idx];
    
    $type = random_int(0, 1) === 1 ? 'add' : 'sub';
    
    if ($type === 'sub') {
        // e.g. 18, 19, 28, 29 (close to nearest upper ten)
        $tens = random_int(1, 4) * 10;
        $ones = random_int(8, 9);
        $op2 = $tens + $ones;
    } else {
        // e.g. 11, 12, 21, 22 (close to lower ten)
        $tens = random_int(1, 4) * 10;
        $ones = random_int(1, 2);
        $op2 = $tens + $ones;
    }
    
    if ($level > 1) {
        $op1 = random_int(50, 150);
        $op2 = random_int(3, 9) * 10 + ($type === 'sub' ? random_int(8, 9) : random_int(1, 2));
    }
    
    return [
        'equation' => "$op1 × $op2",
        'operands' => [$op1, $op2],
        'operation' => '×',
        'type' => $type
    ];
}
