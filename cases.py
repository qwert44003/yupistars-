from dataclasses import dataclass
import random

@dataclass(frozen=True)
class Prize:
    name: str
    rarity: str
    value: int
    weight: int  # relative weight; displayed odds are weight / total * 100

@dataclass(frozen=True)
class Case:
    key: str
    title: str
    price: int
    prizes: tuple[Prize, ...]

CASES = {
    "mask": Case("mask", "🎭 MASK", 249, (
        Prize("Chill Fame", "Обычный", 180, 35),
        Prize("Love Potion", "Обычный", 220, 25),
        Prize("Snoop Dog", "Редкий", 420, 18),
        Prize("Vice Cream", "Редкий", 650, 12),
        Prize("Khabib's Papakha", "Эпический", 1100, 7),
        Prize("Crystal Ball", "Легендарный", 2500, 3),
    )),
    "bear": Case("bear", "🐻 BEAR", 499, (
        # Sample entries: replace with your confirmed YupiStars catalogue.
        Prize("Bear Cub", "Обычный", 250, 40),
        Prize("Golden Paw", "Редкий", 600, 28),
        Prize("Ice Bear", "Редкий", 900, 18),
        Prize("Royal Bear", "Эпический", 1600, 10),
        Prize("Diamond Bear", "Легендарный", 4000, 4),
    )),
}

def pick_prize(case: Case) -> Prize:
    return random.choices(case.prizes, weights=[p.weight for p in case.prizes], k=1)[0]

def odds_text(case: Case) -> str:
    total = sum(p.weight for p in case.prizes)
    return "\n".join(
        f"• {p.name} — {p.weight / total * 100:.2f}%"
        for p in case.prizes
    )
