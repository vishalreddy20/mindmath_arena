<?php
// Base utilities for problem generation
function generate_random_diff($min, $max, $exclude = []) {
    do {
        $val = random_int($min, $max);
    } while (in_array($val, $exclude));
    return $val;
}

// Ensure unique random values based on constraints
function get_friendly_ten($val) {
    return round($val / 10) * 10;
}
