from flask import request, jsonify
from flask_restful import Resource
from server.extensions import api
from server.models.user import User
from server.extensions import db
import traceback
import sys

class SignUp(Resource):
    def post(self):
        try:
            data = request.get_json()
            
            # Validate required fields
            if not all(k in data for k in ['username', 'email', 'password']):
                return {'error': 'Missing required fields'}, 400
            
            # Check if user already exists
            if User.query.filter_by(email=data['email']).first():
                return {'error': 'Email already registered'}, 400
                
            if User.query.filter_by(username=data['username']).first():
                return {'error': 'Username already taken'}, 400
                
            # Create user
            user = User(
                username=data['username'],
                email=data['email']
            )
            user.set_password(data['password'])
            
            # Try to add and commit with detailed error handling
            try:
                db.session.add(user)
                db.session.commit()
                
                user_dict = user.to_dict()
                print(f"New user created: {user.id} - {user.username}")
                print(f"User data returned: {user_dict}")
                return user_dict, 201
            except Exception as e:
                db.session.rollback()
                print(f"Database error during signup: {str(e)}")
                print(traceback.format_exc())
                return {'error': f'Database error: {str(e)}'}, 500
        except Exception as e:
            print(f"Unexpected error during signup: {str(e)}")
            print(traceback.format_exc())
            return {'error': 'Server error', 'details': str(e)}, 500

class Login(Resource):
    def post(self):
        try:
            data = request.get_json()
            user = User.query.filter_by(email=data['email']).first()
            
            if user and user.check_password(data['password']):
                user_dict = user.to_dict()
                print(f"User logged in: {user.id} - {user.username}")
                print(f"User data returned: {user_dict}")
                return user_dict, 200
                
            return {'error': 'Invalid email or password'}, 401
        except Exception as e:
            print(f"Login error: {str(e)}")
            print(traceback.format_exc())
            return {'error': 'Server error during login'}, 500

# Register routes
def register_resources(api):
    api.add_resource(SignUp, '/api/auth/signup')
    api.add_resource(Login, '/api/auth/login')
