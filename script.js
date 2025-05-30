// DOM要素の取得
const messageEl = document.getElementById('message');
const dealerScoreEl = document.getElementById('dealer-score');
const playerScoreEl = document.getElementById('player-score');
const dealerCardsEl = document.getElementById('dealer-cards');
const playerCardsEl = document.getElementById('player-cards');
const startButton = document.getElementById('start-button');
const hitButton = document.getElementById('hit-button');
const standButton = document.getElementById('stand-button');

// --- ゲームの状態を管理する変数 ---
let deck = [];
let playerHand = [];
let dealerHand = [];
let playerScore = 0;
let dealerScore = 0;
let dealerHiddenCard = null; // ディーラーの伏せられたカード
let isGameOver = false;
let playerBlackjack = false;
let dealerBlackjack = false;

// --- イベントリスナーの設定 ---
startButton.addEventListener('click', startGame);
hitButton.addEventListener('click', hit);
standButton.addEventListener('click', stand);

// --- カードとデッキのロジック ---

/**
 * 標準的な52枚のカードデッキを作成する関数
 */
function createDeck() {
    const suits = ['hearts', 'diamonds', 'clubs', 'spades']; // CSSクラス用の名前
    const suitSymbols = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' }; // 表示用の記号
    const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    deck = []; // デッキを初期化

    for (const suit of suits) {
        for (const rank of ranks) {
            deck.push({
                suit: suit,
                suitSymbol: suitSymbols[suit],
                rank: rank,
                value: getCardValue(rank)
            });
        }
    }
    console.log("Deck created:", deck.length, "cards");
}

/**
 * カードのランクに応じた数値（点数）を返す関数
 * @param {string} rank - カードのランク (例: 'A', 'K', '7')
 * @returns {number} カードの点数
 */
function getCardValue(rank) {
    if (rank === 'A') {
        return 11; // エースは初期値を11とする
    } else if (['K', 'Q', 'J'].includes(rank)) {
        return 10;
    } else {
        return parseInt(rank);
    }
}

/**
 * デッキをシャッフルする関数（フィッシャー–イェーツのシャッフル）
 */
function shuffleDeck() {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]]; // 配列の要素を入れ替え
    }
    console.log("Deck shuffled");
}

/**
 * デッキからカードを1枚引く関数
 * @returns {object | undefined} デッキの一番上のカードオブジェクト、またはデッキが空ならundefined
 */
function dealCard() {
    if (deck.length === 0) {
        console.warn("Deck is empty!");
        // 必要に応じてデッキを再作成・再シャッフルする処理を追加することも可能
        // createDeck();
        // shuffleDeck();
        // if (deck.length === 0) return undefined; // それでも空ならエラー
        return undefined;
    }
    return deck.pop();
}

// --- ゲーム進行ロジック ---

/**
 * ゲームを開始する関数
 */
function startGame() {
    console.log("--- 新しいゲームを開始 ---");
    isGameOver = false;
    playerBlackjack = false;
    dealerBlackjack = false;

    // 1. ゲームの状態をリセット
    playerHand = [];
    dealerHand = [];
    dealerHiddenCard = null;
    messageEl.textContent = 'ヒットまたはスタンドを選択してください';

    // 2. デッキを作成しシャッフル
    createDeck();
    shuffleDeck();

    // 3. プレイヤーとディーラーに2枚ずつカードを配る
    // エラーハンドリング: dealCardがundefinedを返す可能性を考慮
    const pCard1 = dealCard();
    const dHiddenCard = dealCard();
    const pCard2 = dealCard();
    const dCard1 = dealCard();

    if (!pCard1 || !dHiddenCard || !pCard2 || !dCard1) {
        messageEl.textContent = "カードの配布に失敗しました。デッキを確認してください。";
        console.error("Failed to deal initial cards.");
        toggleButtons(false, true); // ゲーム開始ボタンのみ有効
        return;
    }

    playerHand.push(pCard1);
    dealerHiddenCard = dHiddenCard;
    playerHand.push(pCard2);
    dealerHand.push(dCard1); // ディーラーの見えるカード

    // 4. UIの更新
    updateUI();
    toggleButtons(true, false); // ヒット/スタンドボタンを表示、スタートボタンを非表示

    // 5. ブラックジャックのチェック
    checkInitialBlackjack();
}

/**
 * プレイヤーが「ヒット」を選択した時の処理
 */
function hit() {
    if (isGameOver) return;

    const newCard = dealCard();
    if (!newCard) {
        messageEl.textContent = "デッキが空です。これ以上カードを引けません。";
        console.warn("Deck is empty, cannot hit.");
        // この時点でスタンド扱いにするか、ゲームを強制終了するかなどの仕様による
        stand(); // 例: デッキが空なら強制スタンド
        return;
    }
    playerHand.push(newCard);
    updateUI();

    if (playerScore > 21) {
        endGame('あなたの負けです！ (バスト)');
    } else if (playerScore === 21) {
        // 21になったら自動でスタンド（オプション）
        stand();
    }
}

/**
 * プレイヤーが「スタンド」を選択した時の処理
 */
function stand() {
    if (isGameOver) return;
    
    // ヒットとスタンドボタンを無効化
    toggleButtons(false, false); // 全てのゲーム中ボタンを無効化
    dealerTurn();
}

/**
 * ディーラーのターンのロジック
 */
function dealerTurn() {
    messageEl.textContent = "ディーラーのターンです...";

    // 伏せカードを公開
    if (dealerHiddenCard) {
        dealerHand.push(dealerHiddenCard);
        dealerHiddenCard = null;
        updateUI(); // ディーラーのスコアを再計算・表示
    } else {
        // dealerHiddenCardが既にない場合（例: ブラックジャックチェック後など）
        // スコアは既に正しいはずなのでUI更新のみで良い場合もある
        updateUI();
    }


    // ディーラーのスコアが17未満の場合、ヒットを繰り返す
    // ディーラーの初期BJチェックはstartGameで行うので、ここでは不要
    const dealerInterval = setInterval(() => {
        if (isGameOver) { // ゲームが既に終了していたら何もしない
            clearInterval(dealerInterval);
            return;
        }

        // ディーラーのスコアを再計算 (エースの変動があるためループ内で毎回計算)
        dealerScore = getScore(dealerHand);
        dealerScoreEl.textContent = dealerScore; // スコア表示を更新

        if (dealerScore < 17) {
            messageEl.textContent = "ディーラーがヒットしています...";
            const newCard = dealCard();
            if (!newCard) {
                messageEl.textContent = "デッキが空です。ディーラーはこれ以上引けません。";
                console.warn("Deck is empty, dealer cannot hit.");
                clearInterval(dealerInterval);
                determineWinner();
                return;
            }
            dealerHand.push(newCard);
            updateUI();
        } else {
            clearInterval(dealerInterval); // 17以上になったら停止
            determineWinner(); // 勝敗判定
        }
    }, 1000); // 1秒ごとにカードを引くアニメーション
}

/**
 * 勝敗を判定する関数
 */
function determineWinner() {
    // ディーラーのターンが終わった時点での最終スコアを更新
    playerScore = getScore(playerHand);
    dealerScore = getScore(dealerHand);
    playerScoreEl.textContent = playerScore;
    dealerScoreEl.textContent = dealerScore;


    if (playerScore > 21) { // プレイヤーがバストしているケースはhit()で処理済みだが念のため
        endGame('あなたの負けです！ (バスト)');
    } else if (dealerScore > 21) {
        endGame('ディーラーがバスト！あなたの勝ちです！');
    } else if (playerBlackjack && !dealerBlackjack) { // プレイヤーBJ、ディーラー非BJ
        endGame('ブラックジャック！あなたの勝ちです！');
    } else if (!playerBlackjack && dealerBlackjack) { // ディーラーBJ、プレイヤー非BJ
        endGame('ディーラーがブラックジャック！あなたの負けです！');
    } else if (playerBlackjack && dealerBlackjack) { // 両者BJ
        endGame('両者ブラックジャック！引き分けです (プッシュ)');
    } else if (playerScore > dealerScore) {
        endGame('あなたの勝ちです！');
    } else if (dealerScore > playerScore) {
        endGame('ディーラーの勝ちです！');
    } else { // 同点
        endGame('引き分けです (プッシュ)');
    }
}

/**
 * ゲーム開始時のブラックジャックをチェックする関数
 */
function checkInitialBlackjack() {
    // スコアを計算
    playerScore = getScore(playerHand);
    // ディーラーの伏せカードを含めたスコアを計算
    const actualDealerHand = dealerHiddenCard ? [...dealerHand, dealerHiddenCard] : [...dealerHand];
    const actualDealerScore = getScore(actualDealerHand);

    playerBlackjack = playerScore === 21 && playerHand.length === 2;
    dealerBlackjack = actualDealerScore === 21 && actualDealerHand.length === 2;

    if (playerBlackjack || dealerBlackjack) {
        // BJが発生したらディーラーのカードを即公開
        if (dealerHiddenCard) {
            dealerHand.push(dealerHiddenCard);
            dealerHiddenCard = null;
        }
        updateUI(); // UIを更新してディーラーの公開カードとスコアを反映

        if (playerBlackjack && dealerBlackjack) {
            endGame('両者ブラックジャック！引き分けです (プッシュ)');
        } else if (playerBlackjack) {
            endGame('ブラックジャック！あなたの勝ちです！');
        } else { // dealerBlackjack のみ
            endGame('ディーラーがブラックジャック！あなたの負けです！');
        }
    }
    // どちらもブラックジャックでなければゲーム続行 (メッセージはstartGameで設定済み)
}


/**
 * ゲームを終了する処理
 * @param {string} finalMessage - 表示する最終メッセージ
 */
function endGame(finalMessage) {
    if (isGameOver) return; // 既に終了処理が走っていたら何もしない
    isGameOver = true;
    messageEl.textContent = finalMessage;
    toggleButtons(false, true); // スタートボタンを再表示、他を非表示・無効化
    console.log(`--- ゲーム終了: ${finalMessage} ---`);
    console.log(`最終スコア - プレイヤー: ${playerScore}, ディーラー: ${dealerScore}`);
    if (dealerHiddenCard) { // ゲーム終了時に伏せカードがまだあれば公開
        dealerHand.push(dealerHiddenCard);
        dealerHiddenCard = null;
        updateUI(); // UIを最終状態に更新
    }
}

// --- UI更新関連の関数 ---

/**
 * 手札、スコアなど、UI全体を更新する関数
 */
function updateUI() {
    // スコアを計算
    playerScore = getScore(playerHand);
    // ディーラーのスコアは、伏せカードがある間は見えているカードのみで計算
    // ただし、ディーラーターンやゲーム終了時は伏せカードも考慮される
    if (dealerHiddenCard) {
        dealerScore = getScore(dealerHand); // 見えているカードのみ
    } else {
        dealerScore = getScore(dealerHand); // 全てのカード
    }
    
    // スコアを表示
    playerScoreEl.textContent = playerScore;
    dealerScoreEl.textContent = dealerScore; // ディーラーのスコアは状況に応じて更新
    
    // カードを描画
    renderCards();
}

/**
 * 手札のカードを画面に描画する関数
 */
function renderCards() {
    // 既存のカード表示をクリア
    playerCardsEl.innerHTML = '';
    dealerCardsEl.innerHTML = '';
    
    // プレイヤーのカードを描画
    playerHand.forEach(card => {
        if (card) playerCardsEl.appendChild(createCardElement(card));
    });

    // ディーラーのカードを描画
    dealerHand.forEach(card => {
        if (card) dealerCardsEl.appendChild(createCardElement(card));
    });

    // ディーラーの伏せカードがあれば、それを描画
    if (dealerHiddenCard) {
        const hiddenCardEl = document.createElement('div');
        hiddenCardEl.classList.add('card', 'hidden-card');
        // hiddenCardEl.textContent = "?"; // 必要ならテキスト表示
        dealerCardsEl.appendChild(hiddenCardEl);
    }
}

/**
 * カードオブジェクトからHTML要素を生成する関数
 * @param {object} card - カードオブジェクト
 * @returns {HTMLElement} カードのDIV要素
 */
function createCardElement(card) {
    const cardEl = document.createElement('div');
    cardEl.classList.add('card', card.suit.toLowerCase()); // suitをクラス名として追加
    
    const rankTopEl = document.createElement('span');
    rankTopEl.classList.add('rank');
    rankTopEl.textContent = card.rank;
    
    const suitEl = document.createElement('span');
    suitEl.classList.add('suit');
    suitEl.textContent = card.suitSymbol;

    const rankBottomEl = document.createElement('span');
    rankBottomEl.classList.add('rank', 'bottom');
    rankBottomEl.textContent = card.rank;

    cardEl.appendChild(rankTopEl);
    cardEl.appendChild(suitEl);
    cardEl.appendChild(rankBottomEl);

    return cardEl;
}

/**
 * 手札の合計スコアを計算する関数（エースの処理も含む）
 * @param {Array<object>} hand - 手札のカード配列
 * @returns {number} 計算されたスコア
 */
function getScore(hand) {
    let score = 0;
    let aceCount = 0;
    
    if (!hand || hand.length === 0) return 0;

    for (const card of hand) {
        if (!card) continue; // dealCardがundefinedを返した場合の対策
        score += card.value;
        if (card.rank === 'A') {
            aceCount++;
        }
    }
    
    // スコアが21を超えていて、手札にエースがある場合、エースを1点として計算し直す
    while (score > 21 && aceCount > 0) {
        score -= 10; // エースの価値を11から1へ変更
        aceCount--;
    }
    
    return score;
}

/**
 * ゲームの状態に応じてボタンの表示/非表示と有効/無効を切り替える関数
 * @param {boolean} showGameButtons - trueならヒット/スタンドを表示・有効化
 * @param {boolean} showStartButton - trueならスタートボタンを表示・有効化
 */
function toggleButtons(showGameButtons, showStartButton) {
    if (showGameButtons) {
        hitButton.classList.remove('hidden');
        standButton.classList.remove('hidden');
        hitButton.disabled = false;
        standButton.disabled = false;
    } else {
        hitButton.classList.add('hidden');
        standButton.classList.add('hidden');
        hitButton.disabled = true;
        standButton.disabled = true;
    }

    if (showStartButton) {
        startButton.classList.remove('hidden');
        startButton.disabled = false;
    } else {
        startButton.classList.add('hidden');
        startButton.disabled = true;
    }
}

// 初期状態ではゲーム開始ボタンのみ表示
document.addEventListener('DOMContentLoaded', () => {
    toggleButtons(false, true);
});
