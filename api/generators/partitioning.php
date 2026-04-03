<?php
function generate_partitioning($level) {
    if ($level == 1) {
        // No carrying across tens bounds
        $t1 = random_int(1, 5) * 10;
        $t2 = random_int(1, 4) * 10;
        $o1 = random_int(1, 4);
        $o2 = random_int(1, 4); // ensures < 10 total ones
        
        $op1 = $t1 + $o1;
        $op2 = $t2 + $o2;
        
        return [
            'equation' => "$op1 + $op2",
            'operands' => [$op1, $op2],
            'operation' => '+'
        ];
    } else {
        // Requires carrying over decade
        $t1 = random_int(2, 6) * 10;
        $t2 = random_int(2, 3) * 10;
        $o1 = random_int(5, 9);
        $o2 = random_int(4, 8);
        
        $op1 = $t1 + $o1;
        $op2 = $t2 + $o2;
        
        return [
            'equation' => "$op1 + $op2",
            'operands' => [$op1, $op2],
            'operation' => '+'
        ];
    }
}
