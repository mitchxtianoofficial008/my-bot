@echo off
title Mitch Christiano WhatsApp Bot
if not exist node_modules call npm install
if not exist .env call npm run setup
npm start
pause
