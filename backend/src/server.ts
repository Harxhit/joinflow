import "dotenv/config";
import app from './app'
import config from "./config";

const PORT = process.env.PORT ;

const server = async () => {
  try {
    app.listen(config.port, () => {
      console.log(`ConfigFlow API running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Server startup error:", error);
    process.exit(1);
  }
};

server();