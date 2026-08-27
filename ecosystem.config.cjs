module.exports = {
  apps: [{
    name: "mitch-christiano-bot",
    script: "src/index.js",
    restart_delay: 3000,
    max_memory_restart: "512M",
    env: { NODE_ENV: "production" }
  }]
}
