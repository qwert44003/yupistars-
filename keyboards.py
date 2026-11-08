from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton

def main_menu():
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🎁 Кейсы", callback_data="cases"),
         InlineKeyboardButton(text="👤 Профиль", callback_data="profile")],
        [InlineKeyboardButton(text="🎒 Инвентарь", callback_data="inventory"),
         InlineKeyboardButton(text="🏆 Топ игроков", callback_data="top")],
        [InlineKeyboardButton(text="💳 Пополнение", callback_data="deposit"),
         InlineKeyboardButton(text="🤝 Рефералы", callback_data="referrals")],
        [InlineKeyboardButton(text="⚙️ Настройки", callback_data="settings")],
    ])

def cases_menu(cases):
    rows = [[InlineKeyboardButton(
        text=f"{c.title} · {c.price} ⭐",
        callback_data=f"case:{c.key}"
    )] for c in cases]
    rows.append([InlineKeyboardButton(text="⬅️ Назад", callback_data="home")])
    return InlineKeyboardMarkup(inline_keyboard=rows)

def case_actions(key):
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🎲 Открыть", callback_data=f"open:{key}")],
        [InlineKeyboardButton(text="📊 Шансы", callback_data=f"odds:{key}")],
        [InlineKeyboardButton(text="⬅️ К кейсам", callback_data="cases")],
    ])

def back_home():
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="⬅️ Главное меню", callback_data="home")]
    ])

def inventory_keyboard(items):
    rows = []
    for item in items[:20]:
        rows.append([InlineKeyboardButton(
            text=f"💎 {item.item_name} · продать за {item.sell_price} ⭐",
            callback_data=f"sell:{item.id}"
        )])
    rows.append([InlineKeyboardButton(text="⬅️ Назад", callback_data="home")])
    return InlineKeyboardMarkup(inline_keyboard=rows)
