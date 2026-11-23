import bcrypt from "bcryptjs"

const SALT_ROUND = 10

const hashPassword = (password: string): Promise<string> => {
    return bcrypt.hash(password, SALT_ROUND)
}

const comparePassword = (password: string, hashPassword: string): Promise<boolean> => {
    return bcrypt.compare(password, hashPassword)
}

export {hashPassword , comparePassword}