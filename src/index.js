const env = process.env.NODE_ENV

const chalk = require('chalk')
const config = require('./config')[env]
const ssl_options = require('./utils/ssl_options')()
const format_obj = require('./utils/format_object')

const log = console.log

module.exports = class Server {
  constructor(options) {
    this.clients = []
    this.init(options)
  }

  init(options) {
    log(chalk`{blueBright Starting websockets server on port ${options.port}}`)

    this.port = options.port
    this.http = require(config.http_package)
      .createServer(ssl_options).listen(this.port)
    this.server = require('engine.io')(this.http)

    this.initEventListeners()

    log(chalk`{greenBright Websockets server listening on port ${this.port}}`)
  }

  initEventListeners() {
    this.server.on('connection', socket => {
      this.addClient(socket)

      socket.on('message', data => {
        this.handleIncoming(data, socket)
      })

      socket.on('close', () => {
        this.removeClient(socket)
      })
    })
  }

  sendMessage(data, socket) {
    socket.send(JSON.stringify(data))
  }

  sendToClients(data, clients) {
    for (var socket in clients) {
      this.sendMessage(data, clients[socket])
    }
  }

  handleIncoming(_data, socket) {
    this.sendMessage({
      message: 'Data received!'
    }, socket)

    let data = JSON.parse(_data)
    log(format_obj(data))

    this.sendToClients(data, this.clients)
  }

  addClient(socket) {
    this.clients[socket.id] = socket

    const length = Object.keys(this.clients).length
    log(chalk`{blueBright Connected to ${socket.remoteAddress}, {magentaBright ${length}} clients total}`)
  }

  removeClient(socket) {
    const id = socket.id
    delete this.clients[id]
    log(chalk.magentaBright(`closed ${socket.remoteAddress}`))
  }
}