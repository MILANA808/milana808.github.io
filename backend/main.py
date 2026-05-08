from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from dotenv import load_dotenv
load_dotenv()

app = FastAPI(title="AKSI-CORE Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "Resonance Field active. DIMAX v3 online."}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
