let heroHp = 100;
const heroMaxHp = 100;
let enemyHp = 80;
const enemyMaxHp = 80;
let isGameOver = false;

function updateUI() {
    document.getElementById('hero-hp-text').innerText = heroHp;
    document.getElementById('enemy-hp-text').innerText = enemyHp;

    const heroPercent = (heroHp / heroMaxHp) * 100;
    const enemyPercent = (enemyHp / enemyMaxHp) * 100;
    document.getElementById('hero-hp').style.width = Math.max(0, heroPercent) + '%';
    document.getElementById('enemy-hp').style.width = Math.max(0, enemyPercent) + '%';
}

function logMessage(msg) {
    const logBox = document.getElementById('battle-log');
    logBox.innerHTML = `<p>${msg}</p>` + logBox.innerHTML;
}

function playerAttack(type) {
    if (isGameOver) return;

    let damage = 0;
    if (type === 'light') {
        damage = Math.floor(Math.random() * 8) + 10;
        logMessage(`Quick Slash deals <strong>${damage}</strong> damage.`);
    } else if (type === 'heavy') {
        if (Math.random() > 0.3) {
            damage = Math.floor(Math.random() * 15) + 18;
            logMessage(`Heavy Strike hits for <strong>${damage}</strong> damage.`);
        } else {
            logMessage(`Heavy Strike missed!`);
        }
    }

    enemyHp -= damage;
    if (enemyHp <= 0) {
        enemyHp = 0;
        updateUI();
        logMessage(`<strong>Victory!</strong> You defeated the goblin.`);
        endGame();
        return;
    }

    updateUI();
    disableControls(true);
    setTimeout(enemyTurn, 1000);
}

function playerHeal() {
    if (isGameOver) return;

    const healAmount = Math.floor(Math.random() * 10) + 15;
    heroHp = Math.min(heroMaxHp, heroHp + healAmount);
    logMessage(`You drank a potion and restored <strong>${healAmount}</strong> HP.`);

    updateUI();
    disableControls(true);
    setTimeout(enemyTurn, 1000);
}

function enemyTurn() {
    if (isGameOver) return;

    const enemyDamage = Math.floor(Math.random() * 8) + 8;
    heroHp -= enemyDamage;
    logMessage(`The goblin strikes back for <strong>${enemyDamage}</strong> damage.`);

    if (heroHp <= 0) {
        heroHp = 0;
        updateUI();
        logMessage(`<strong>Game Over!</strong> You were defeated.`);
        endGame();
        return;
    }

    updateUI();
    disableControls(false);
}

function disableControls(disabled) {
    const buttons = document.querySelectorAll('.control-panel button');
    buttons.forEach(btn => btn.disabled = disabled);
}

function endGame() {
    isGameOver = true;
    disableControls(true);
    document.getElementById('restart-btn').style.display = 'block';
}

function restartGame() {
    heroHp = heroMaxHp;
    enemyHp = enemyMaxHp;
    isGameOver = false;
    document.getElementById('restart-btn').style.display = 'none';
    document.getElementById('battle-log').innerHTML = `<p>A new battle begins! Choose your move.</p>`;
    updateUI();
    disableControls(false);
}
