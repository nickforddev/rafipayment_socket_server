'use strict'

module.exports = function(options) {
  let ssl = false
  if (['production', 'staging'].includes(process.env.NODE_ENV)) {
    ssl = true
  }

  const fs = require('fs')
  const engine = require('engine.io')
  const port = options.port

  let http_package
  let ssl_options

  if (ssl) {
    console.log('using ssl')
    http_package = 'https'

    let domain = process.env.NODE_ENV === 'production' ?
      'rafipayment.com' :
      'staging.rafipayment.com'

    let root_path = '/etc/letsencrypt/live/'
    let key_path =  `${root_path}${domain}/privkey.pem`
    let cert_path = `${root_path}${domain}/cert.pem`

    ssl_options = {
      key: fs.readFileSync( key_path ),
      cert: fs.readFileSync( cert_path )
    }
    console.log(ssl_options)
  } else {
    http_package = 'http'
  }

  const http = require(http_package)
    .createServer(ssl_options).listen(port)

  console.log(`Sockets server listening on port ${port}`)

  const server = engine.attach(http)

  let clients = []

  function sendMessage(data, socket) {
    socket.send(JSON.stringify(data))
  }

  function sendToClients(data, clients) {
    for (var socket in clients) {
      console.log(socket)
      sendMessage(data, clients[socket])
    }
  }

  function handleIncoming(_data, socket) {
    sendMessage({
      message: 'Data received!'
    }, socket)

    let data = JSON.parse(_data)
    console.log(data)

    if (data.event === 'deployment') {
      if (data.refresh === true) {
        sendToClients(data, clients)
      }
    }
  }

  function addClient(socket) {
    clients[socket.id] = socket
  }

  function removeClient(socket) {
    delete clients[socket.id]
  }

  server.on('connection', socket => {
    addClient(socket)
    console.log(Object.keys(clients).length)

    console.log(socket.remoteAddress)

    socket.on('message', data => {
      handleIncoming(data, socket)
    })

    socket.on('close', () => {
      console.log('closed')
      removeClient(socket)
    })
  })

}
