import dotenv from 'dotenv'
import type { SignOptions } from "jsonwebtoken";
interface Config{
    nodeEnviorment: string; 
    port: number; 
    DB_URL: string; 
    corsOrigin: string;
    jwtSecret:string;
    jwtExpiry: SignOptions["expiresIn"];
}

const checkValid = (value:string): boolean => {
    return Number.isNaN(Number(value))
}

function loadConfig():Config{
    const nodeEnviorment = process.env.NODE_ENV
    const port = process.env.PORT
    const db_url = process.env.DB_URL
    const corsOrigin = process.env.CORS_ORIGIN
    const jwtSecret = process.env.JWT_SECRET
    const jwtExpiry = process.env.JWT_EXPIRY as SignOptions["expiresIn"];

    if(!nodeEnviorment || !port || !db_url || !corsOrigin || !jwtSecret || !jwtExpiry){
        throw new Error('Enviorment variable is missing')
    }


    if(checkValid(port)){
        throw new Error('Invalid numeric env')
    }

    return {
        nodeEnviorment: nodeEnviorment, 
        port: Number(port),
        DB_URL: db_url, 
        corsOrigin: corsOrigin, 
        jwtSecret: jwtSecret, 
        jwtExpiry: jwtExpiry
    }

}

const config = loadConfig()

export default config