import { useState, useCallback, useEffect } from 'react';
import type { AppProps } from '@zos-apps/config';
import { useLocalStorage } from '@zos-apps/config';

type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
type Card = { suit: Suit; rank: number; faceUp: boolean };

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const SUIT_SYMBOLS: Record<Suit, string> = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };
const RANK_NAMES: Record<number, string> = { 1: 'A', 11: 'J', 12: 'Q', 13: 'K' };

const isRed = (suit: Suit) => suit === 'hearts' || suit === 'diamonds';

const createDeck = (): Card[] => {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (let rank = 1; rank <= 13; rank++) {
      deck.push({ suit, rank, faceUp: false });
    }
  }
  return deck;
};

const shuffle = <T,>(arr: T[]): T[] => {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

interface SolitaireStats {
  gamesPlayed: number;
  gamesWon: number;
  bestMoves: number | null;
}

const Solitaire: React.FC<AppProps> = ({ onClose: _onClose }) => {
  const [stats, setStats] = useLocalStorage<SolitaireStats>('solitaire-stats', {
    gamesPlayed: 0,
    gamesWon: 0,
    bestMoves: null,
  });
  const [tableau, setTableau] = useState<Card[][]>([]);
  const [foundations, setFoundations] = useState<Card[][]>([[], [], [], []]);
  const [stock, setStock] = useState<Card[]>([]);
  const [waste, setWaste] = useState<Card[]>([]);
  const [selected, setSelected] = useState<{ pile: string; index: number; cardIndex: number } | null>(null);
  const [moves, setMoves] = useState(0);
  const [gameWon, setGameWon] = useState(false);

  const initGame = useCallback((countAsNewGame = true) => {
    const deck = shuffle(createDeck());
    const newTableau: Card[][] = [];
    let deckIndex = 0;

    for (let i = 0; i < 7; i++) {
      const pile: Card[] = [];
      for (let j = 0; j <= i; j++) {
        const card = { ...deck[deckIndex++], faceUp: j === i };
        pile.push(card);
      }
      newTableau.push(pile);
    }

    setTableau(newTableau);
    setStock(deck.slice(deckIndex).map(c => ({ ...c, faceUp: false })));
    setWaste([]);
    setFoundations([[], [], [], []]);
    setSelected(null);
    setMoves(0);
    setGameWon(false);
    if (countAsNewGame) {
      setStats(prev => ({ ...prev, gamesPlayed: prev.gamesPlayed + 1 }));
    }
  }, [setStats]);

  useEffect(() => {
    initGame(false); // Don't count initial load as a new game
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (foundations.every(f => f.length === 13)) {
      setGameWon(true);
      setStats(prev => ({
        ...prev,
        gamesWon: prev.gamesWon + 1,
        bestMoves: prev.bestMoves === null ? moves : Math.min(prev.bestMoves, moves),
      }));
    }
  }, [foundations, moves, setStats]);

  const drawFromStock = () => {
    if (stock.length === 0) {
      setStock(waste.map(c => ({ ...c, faceUp: false })).reverse());
      setWaste([]);
    } else {
      const card = { ...stock[stock.length - 1], faceUp: true };
      setStock(stock.slice(0, -1));
      setWaste([...waste, card]);
    }
    setSelected(null);
  };

  const canPlaceOnTableau = (card: Card, pile: Card[]): boolean => {
    if (pile.length === 0) return card.rank === 13;
    const topCard = pile[pile.length - 1];
    return topCard.faceUp && isRed(card.suit) !== isRed(topCard.suit) && card.rank === topCard.rank - 1;
  };

  const canPlaceOnFoundation = (card: Card, pile: Card[]): boolean => {
    if (pile.length === 0) return card.rank === 1;
    const topCard = pile[pile.length - 1];
    return card.suit === topCard.suit && card.rank === topCard.rank + 1;
  };

  const handleCardClick = (pile: string, pileIndex: number, cardIndex: number) => {
    const getCards = (): Card[] => {
      if (pile === 'tableau') return tableau[pileIndex];
      if (pile === 'waste') return waste;
      if (pile === 'foundation') return foundations[pileIndex];
      return [];
    };

    const cards = getCards();
    const card = cards[cardIndex];
    if (!card?.faceUp) return;

    if (selected) {
      // Try to move
      const srcCards = selected.pile === 'tableau' ? tableau[selected.index] :
                       selected.pile === 'waste' ? waste :
                       foundations[selected.index];
      const movingCards = srcCards.slice(selected.cardIndex);

      if (pile === 'tableau' && canPlaceOnTableau(movingCards[0], tableau[pileIndex])) {
        const newTableau = [...tableau];
        newTableau[pileIndex] = [...tableau[pileIndex], ...movingCards];
        
        if (selected.pile === 'tableau') {
          newTableau[selected.index] = tableau[selected.index].slice(0, selected.cardIndex);
          if (newTableau[selected.index].length > 0) {
            newTableau[selected.index][newTableau[selected.index].length - 1].faceUp = true;
          }
        } else if (selected.pile === 'waste') {
          setWaste(waste.slice(0, -1));
        }
        
        setTableau(newTableau);
        setMoves(m => m + 1);
        setSelected(null);
        return;
      }

      if (pile === 'foundation' && movingCards.length === 1 && canPlaceOnFoundation(movingCards[0], foundations[pileIndex])) {
        const newFoundations = [...foundations];
        newFoundations[pileIndex] = [...foundations[pileIndex], movingCards[0]];
        
        if (selected.pile === 'tableau') {
          const newTableau = [...tableau];
          newTableau[selected.index] = tableau[selected.index].slice(0, -1);
          if (newTableau[selected.index].length > 0) {
            newTableau[selected.index][newTableau[selected.index].length - 1].faceUp = true;
          }
          setTableau(newTableau);
        } else if (selected.pile === 'waste') {
          setWaste(waste.slice(0, -1));
        }
        
        setFoundations(newFoundations);
        setMoves(m => m + 1);
        setSelected(null);
        return;
      }

      setSelected(null);
    } else {
      setSelected({ pile, index: pileIndex, cardIndex });
    }
  };

  const handleFoundationClick = (index: number) => {
    if (!selected) return;
    
    const srcCards = selected.pile === 'tableau' ? tableau[selected.index] :
                     selected.pile === 'waste' ? waste : [];
    const card = srcCards[selected.cardIndex];
    
    if (card && canPlaceOnFoundation(card, foundations[index])) {
      const newFoundations = [...foundations];
      newFoundations[index] = [...foundations[index], card];
      
      if (selected.pile === 'tableau') {
        const newTableau = [...tableau];
        newTableau[selected.index] = tableau[selected.index].slice(0, -1);
        if (newTableau[selected.index].length > 0) {
          newTableau[selected.index][newTableau[selected.index].length - 1].faceUp = true;
        }
        setTableau(newTableau);
      } else if (selected.pile === 'waste') {
        setWaste(waste.slice(0, -1));
      }
      
      setFoundations(newFoundations);
      setMoves(m => m + 1);
    }
    setSelected(null);
  };

  const renderCard = (card: Card | null, pile: string, pileIndex: number, cardIndex: number, offset: number = 0) => {
    const isSelected = selected?.pile === pile && selected?.index === pileIndex && selected?.cardIndex === cardIndex;
    
    if (!card) {
      return (
        <div
          className="w-16 h-24 rounded-lg border-2 border-dashed border-green-600/50 bg-green-900/20"
        />
      );
    }

    if (!card.faceUp) {
      return (
        <div
          className="w-16 h-24 rounded-lg bg-gradient-to-br from-blue-600 to-blue-800 border-2 border-blue-400 shadow-lg"
          style={{ marginTop: offset > 0 ? -80 : 0 }}
        >
          <div className="w-full h-full flex items-center justify-center text-blue-300 text-2xl">
            🂠
          </div>
        </div>
      );
    }

    const rankDisplay = RANK_NAMES[card.rank] || card.rank.toString();
    const suitColor = isRed(card.suit) ? 'text-red-600' : 'text-gray-900';

    return (
      <div
        onClick={() => handleCardClick(pile, pileIndex, cardIndex)}
        className={`
          w-16 h-24 rounded-lg bg-white border-2 shadow-lg cursor-pointer transition-all
          ${isSelected ? 'ring-4 ring-yellow-400 -translate-y-2' : 'hover:ring-2 hover:ring-blue-400'}
          ${suitColor}
        `}
        style={{ marginTop: offset > 0 ? -80 : 0 }}
      >
        <div className="p-1 text-xs font-bold">{rankDisplay}{SUIT_SYMBOLS[card.suit]}</div>
        <div className="flex-1 flex items-center justify-center text-3xl">
          {SUIT_SYMBOLS[card.suit]}
        </div>
        <div className="p-1 text-xs font-bold text-right rotate-180">{rankDisplay}{SUIT_SYMBOLS[card.suit]}</div>
      </div>
    );
  };

  if (gameWon) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-gradient-to-b from-green-800 to-green-950">
        <div className="text-6xl mb-4">🎉</div>
        <h1 className="text-4xl font-bold text-white mb-4">You Won!</h1>
        <p className="text-green-200 mb-6">Completed in {moves} moves</p>
        <button
          onClick={() => initGame()}
          className="px-6 py-3 bg-white text-green-800 font-bold rounded-lg hover:bg-green-100"
        >
          Play Again
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-green-800 to-green-950 p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-4">
          <span className="text-2xl">🃏</span>
          <h1 className="text-xl font-bold text-white">Solitaire</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-green-200">Moves: {moves}</span>
          <span className="text-green-200/60 text-sm">
            {stats.gamesWon}/{stats.gamesPlayed} wins
            {stats.bestMoves !== null && ` • Best: ${stats.bestMoves}`}
          </span>
          <button
            onClick={() => initGame()}
            className="px-4 py-2 bg-green-700 hover:bg-green-600 text-white rounded"
          >
            New Game
          </button>
        </div>
      </div>

      {/* Top row: Stock, Waste, Foundations */}
      <div className="flex gap-4 mb-8">
        {/* Stock */}
        <div onClick={drawFromStock} className="cursor-pointer">
          {stock.length > 0 ? (
            <div className="w-16 h-24 rounded-lg bg-gradient-to-br from-blue-600 to-blue-800 border-2 border-blue-400 shadow-lg flex items-center justify-center">
              <span className="text-white text-xs">{stock.length}</span>
            </div>
          ) : (
            <div className="w-16 h-24 rounded-lg border-2 border-dashed border-green-600/50 flex items-center justify-center text-green-600">
              ↻
            </div>
          )}
        </div>

        {/* Waste */}
        <div>
          {waste.length > 0 ? (
            renderCard(waste[waste.length - 1], 'waste', 0, waste.length - 1)
          ) : (
            <div className="w-16 h-24 rounded-lg border-2 border-dashed border-green-600/50" />
          )}
        </div>

        <div className="flex-1" />

        {/* Foundations */}
        {foundations.map((pile, i) => (
          <div key={i} onClick={() => handleFoundationClick(i)} className="cursor-pointer">
            {pile.length > 0 ? (
              renderCard(pile[pile.length - 1], 'foundation', i, pile.length - 1)
            ) : (
              <div className="w-16 h-24 rounded-lg border-2 border-dashed border-green-600/50 flex items-center justify-center text-green-600/50 text-2xl">
                {SUIT_SYMBOLS[SUITS[i]]}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Tableau */}
      <div className="flex gap-4 flex-1">
        {tableau.map((pile, pileIndex) => (
          <div key={pileIndex} className="relative" style={{ minHeight: 200 }}>
            {pile.length === 0 ? (
              <div
                onClick={() => selected && handleCardClick('tableau', pileIndex, 0)}
                className="w-16 h-24 rounded-lg border-2 border-dashed border-green-600/50 cursor-pointer"
              />
            ) : (
              pile.map((card, cardIndex) => (
                <div key={cardIndex} style={{ position: cardIndex === 0 ? 'relative' : 'absolute', top: cardIndex * 24 }}>
                  {renderCard(card, 'tableau', pileIndex, cardIndex, cardIndex)}
                </div>
              ))
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Solitaire;
