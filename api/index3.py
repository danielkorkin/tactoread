from flask import Flask, jsonify, request

app = Flask(__name__)

@app.route("/api/python")
def hello_world():
    print("Got a hit")

    return jsonify({
        "status": 500,
        "statusText": "Hello from Flask serverless backend!"
    }), 500  # <-- this second value is the actual HTTP status
    
@app.route("/cheese")
def cheese():
    print("cheese")
    return jsonify({
        "status": "cheese"
    })

# Necessary to run locally via python api/index.py if needed
if __name__ == "__main__":
    app.run(port=5328)
