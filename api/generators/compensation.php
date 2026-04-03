<?php
function generate_compensation($level) {
    if ($level == 1) {
        $sub_ones = random_int(0, 1) === 0 ? 8 : 9;
        $sub_tens = random_int(1, 4) * 10;
        $subtrahend = $sub_tens + $sub_ones;
        $minuend = $subtrahend + random_int(12, 35);
        $adj = 10 - $sub_ones;
        
        return [
            'equation' => "$minuend - $subtrahend",
            'operands' => [$minuend, $subtrahend],
            'operation' => '-',
            'adjustment' => $adj,
            'direction' => '+'
        ];
    } else {
        // Harder levels: addition using compensation
        $o2_ones = random_int(0, 1) === 0 ? 8 : 9;
        $o2_tens = random_int(2, 6) * 10;
        $o2 = $o2_tens + $o2_ones;
        $o1 = random_int(21, 65);
        $adj = 10 - $o2_ones;
        
        return [
            'equation' => "$o1 + $o2",
            'operands' => [$o1, $o2],
            'operation' => '+',
            'adjustment' => $adj,
            'direction' => '+'
        ];
    }
}
