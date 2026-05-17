import os
from flask import Flask, request, jsonify
from flask_cors import CORS
import stripe

app = Flask(__name__)
CORS(app)

# Replace with your actual Stripe Secret Key
stripe.api_key = "sk_test_your_actual_secret_key_here"

@app.route('/create-payment-intent', methods=['POST'])
def create_payment():
    try:
        data = request.get_json()
        amount = data.get('amount')
        currency = data.get('currency', 'usd')

        if not amount:
            return jsonify({'error': 'Amount is required'}), 400

        intent = stripe.PaymentIntent.create(
            amount=amount, 
            currency=currency,
            metadata={'action': 'deposit'}
        )
        return jsonify({'clientSecret': intent.client_secret})

    except stripe.error.StripeError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f"Internal Server Error: {str(e)}"}), 500


@app.route('/create-withdrawal', methods=['POST'])
def create_withdrawal():
    try:
        data = request.get_json()
        amount = data.get('amount')
        currency = data.get('currency', 'usd')

        if not amount or amount <= 0:
            return jsonify({'error': 'Invalid withdrawal amount'}), 400

        # NOTE: Real Stripe payouts require a connected Custom/Express account 
        # using stripe.Payout.create() or stripe.Transfer.create().
        # For this local setup, we simulate a successful outbound response.
        
        return jsonify({
            'success': True,
            'message': f"Successfully processed withdrawal of ${(amount/100):.2f}",
            'amount': amount,
            'currency': currency
        })

    except Exception as e:
        return jsonify({'error': f"Withdrawal failed: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(port=4242, debug=True)