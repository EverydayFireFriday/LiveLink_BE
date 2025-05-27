import express, { Request, Response } from 'express';
import dotenv from 'dotenv';

dotenv.config()

const app = express()
const PORT = process.env.PORT

app.listen(PORT, () => {
    console.log("localhost 3000 서버 실행")
})

app.get('/', (req, res) => {
    res.send("하이");
})