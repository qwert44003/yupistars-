from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from app.config import BOT_TOKEN
from app.db import init_db
from app.handlers.user import router as user_router
from app.handlers.admin import router as admin_router

async def main():
    if not BOT_TOKEN:
        raise RuntimeError("BOT_TOKEN не задан. Скопируй .env.example в .env и вставь токен.")
    await init_db()
    bot = Bot(BOT_TOKEN, default=DefaultBotProperties(parse_mode=ParseMode.HTML))
    dp = Dispatcher()
    dp.include_router(admin_router)
    dp.include_router(user_router)
    await dp.start_polling(bot)

