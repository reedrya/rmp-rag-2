import tensorflow as tf
from transformers import TFAutoModel, AutoTokenizer
from pinecone import Pinecone, ServerlessSpec
import os
import json
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Set the environment variables and API keys
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")

# Initialize Pinecone
pc = Pinecone(api_key=PINECONE_API_KEY)

index_name = "rag"
VECTOR_DIMENSION = 768  # DistilBERT's output dimension

# Check if the index exists; if not, create it
if index_name not in pc.list_indexes().names():
    pc.create_index(
        name=index_name,
        dimension=VECTOR_DIMENSION,
        metric='cosine',
        spec=ServerlessSpec(
            cloud='aws',
            region='us-east-1'  # Change region to 'us-east-1', which is supported on the free plan
        )
    )

# Get the index
index = pc.Index(index_name)

model_name = 'distilbert-base-uncased'
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = TFAutoModel.from_pretrained(model_name)


def get_embeddings(texts):
    inputs = tokenizer(texts, return_tensors="tf", padding=True, truncation=True, max_length=512)
    outputs = model(inputs)
    embeddings = tf.reduce_mean(outputs.last_hidden_state, axis=1)
    return embeddings.numpy().tolist()


# Load the review data
data = json.load(open("reviews.json"))

processed_data = []

for review in data["reviews"]:
    embedding = get_embeddings([review["review"]])[0]  # Get the embedding for the review text
    
    # Validate the embedding length
    if len(embedding) != VECTOR_DIMENSION:
        print(f"Invalid embedding for {review['professor']}: {embedding}")
        continue
    
    processed_data.append(
        {
            "id": review["professor"],
            "values": embedding,
            "metadata": {
                "review": review["review"],
                "subject": review["subject"],
                "stars": review["stars"],
            }
        }
    )

# Insert the embeddings into the Pinecone index
upsert_response = index.upsert(vectors=processed_data)
print(f"Upserted count: {upsert_response['upserted_count']}")

# Print index statistics
print(index.describe_index_stats())
