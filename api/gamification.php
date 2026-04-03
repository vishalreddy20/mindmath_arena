<?php

function XPForNextLevel($currentLevel) {
    if ($currentLevel <= 1) return 200;
    return floor(200 * pow(1.5, $currentLevel - 1));
}

function processCompletion($pdo, $userId, $data) {
    $timeTaken = (int)($data['time'] ?? 30);
    $streak = (int)($data['streak'] ?? 1);
    
    // Base XP
    $xpEarned = 50;
    
    // Time multiplier bonus
    if ($timeTaken < 10) $xpEarned += 25;
    else if ($timeTaken < 20) $xpEarned += 10;
    
    // Streak bonus
    $xpEarned += min($streak * 5, 25);
    
    // Fetch current user state
    $stmt = $pdo->prepare("SELECT level, xp FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if(!$user) throw new Exception("User not found");
    
    $newXpTotal = $user['xp'] + $xpEarned;
    $currentLevel = $user['level'];
    $xpNeeded = XPForNextLevel($currentLevel);
    
    $leveledUp = false;
    while ($newXpTotal >= $xpNeeded) {
        $currentLevel++;
        $newXpTotal -= $xpNeeded;
        $xpNeeded = XPForNextLevel($currentLevel);
        $leveledUp = true;
    }
    
    // Update DB
    $update = $pdo->prepare("UPDATE users SET xp = ?, level = ? WHERE id = ?");
    $update->execute([$newXpTotal, $currentLevel, $userId]);
    
    // Compute new badges (Stub logic - example: first problem solved)
    $newBadges = [];
    $badgeId = 'first-win';
    
    $checkBadge = $pdo->prepare("SELECT id FROM badges WHERE user_id = ? AND badge_id = ?");
    $checkBadge->execute([$userId, $badgeId]);
    if (!$checkBadge->fetch()) {
        $insertBadge = $pdo->prepare("INSERT INTO badges (user_id, badge_id) VALUES (?, ?)");
        $insertBadge->execute([$userId, $badgeId]);
        $newBadges[] = ['id' => $badgeId, 'name' => 'First Victory', 'desc' => 'Solved your first math tree.', 'icon' => '🏆'];
    }
    
    // Fetch all earned badges to update state
    
    return [
        'earnedXp' => $xpEarned,
        'leveledUp' => $leveledUp,
        'newBadges' => $newBadges,
        'state' => getGameState($pdo, $userId)
    ];
}

function getGameState($pdo, $userId) {
    $stmt = $pdo->prepare("SELECT username, level, xp FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    $u = $stmt->fetch(PDO::FETCH_ASSOC);
    
    $badgesStmt = $pdo->prepare("SELECT badge_id FROM badges WHERE user_id = ?");
    $badgesStmt->execute([$userId]);
    $bRows = $badgesStmt->fetchAll(PDO::FETCH_COLUMN);
    
    $badgesFormatted = [];
    foreach($bRows as $b) {
        if ($b === 'first-win') {
            $badgesFormatted[] = ['id' => $b, 'name' => 'First Victory', 'desc' => 'Solved your first math tree.', 'icon' => '🏆'];
        }
    }
    
    return [
        'player' => $u['username'],
        'level' => $u['level'],
        'xp' => $u['xp'],
        'xpToNext' => XPForNextLevel($u['level']),
        'badges' => $badgesFormatted
    ];
}
