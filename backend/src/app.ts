import express from 'express'
import cors from 'cors'
import config from './config';
import cookie from 'cookie-parser'
import authRoute from './routes/auth.routes';
import groupRoute from './routes/group.routes';
import assignmentRoute from './routes/assignment.routes';
import submissionRoute from './routes/submission.route';

const app = express()

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookie());

app.use(
  cors({
    origin: config.corsOrigin,
    credentials: true,
  })
);


app.use((request, response, next) => {
  const start = Date.now();

  console.log(
    `[REQUEST] ${request.method} ${request.originalUrl}`
  );

  response.on("finish", () => {
    console.log(
      `[RESPONSE] ${request.method} ${request.originalUrl} - ${response.statusCode} - ${Date.now() - start}ms`
    );
  });

  next();
});

//Routes
app.use("/api/auth", authRoute)
app.use("/api/group", groupRoute)
app.use("/api/assignment", assignmentRoute)
app.use("/api/submission", submissionRoute)

app.get("/health", (_request, response) => {
  return response.status(200).json({
    success: true,
    message: "ConfigFlow API is running",
  });
});

export default app
