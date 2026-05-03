from fastapi import FastAPI, UploadFile, File
from fastapi.responses import StreamingResponse
from rembg import remove
import io

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()


origins = [
    "http://localhost:5173",  # your React app
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,        # or ["*"] for testing
    allow_credentials=True,
    allow_methods=["*"],          # GET, POST, etc.
    allow_headers=["*"],          # all headers
)


@app.get("/")
@app.get("/hello/")
async def hello():
    return "Hello World"


@app.post("/photolab/remove-bg/")
async def remove_bg(file: UploadFile = File(...)):

    # Read image bytes
    input_bytes = await file.read()

    # Remove background
    output_bytes = remove(input_bytes)

    # Return processed image
    return StreamingResponse(
        io.BytesIO(output_bytes),
        media_type="image/png"   # PNG because background is transparent
    )
