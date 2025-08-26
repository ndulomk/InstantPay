import fastify from "fastify";
import { bankController } from "./bank/controllers/bank";

const server = fastify({logger:true})

server.get('/ping', async(request, reply)=>{
  return 'pong\n'
})

server.post("/banks", bankController.create)

server.setErrorHandler(( error, request, reply ) =>{
  server.log.error(error);
  reply.status(500).send({ 
    status: 'error',
    message: 'Internal Server Error'  
  })
})

server.listen({ port: 9999 }, (err, address)=>{
  if(err) {
    console.error(err)
    process.exit(1)
  }
  console.log(`Server listening at  ${address}`)
})