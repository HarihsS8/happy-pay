import os
from flask import Flask, jsonify, request
from flask_cors import CORS # Added CORS so your HTML file can talk to your Flask server
import stripe

app = Flask(__name__)
CORS(app) # Enables cross-origin requests for local testing

# Replace this with your actual Stripe Test Secret Key
stripe.api_key = "sk_test_51Nx..."

@app.route('/create-payment-intent', methods=["POST"])
def create_payment():
    try:
        data = request.get_json()
        amount = data.get('amount')  # Amount in cents (e.g., 2000 = $20.00)
        currency = data.get('currency', 'usd')

        if not amount:
            return jsonify({"error": "Amount is required"}), 400

        # Create the PaymentIntent
        intent = stripe.PaymentIntent.create(
            amount=amount,
            currency=currency,
            # Enabling automatic methods allows both Cards and ACH Bank Deposits
            automatic_payment_methods={
                'enabled': True,
            },
        )

        # Return the client secret to the frontend
        return jsonify({
            'clientSecret': intent['client_secret']
        }), 200

    except Exception as e:
        return jsonify(error=str(e)), 400

if __name__ == '__main__':
    app.run(port=4242, debug=True)