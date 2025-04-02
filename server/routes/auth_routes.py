from flask import request, jsonify
from flask_restful import Resource
from server.extensions import api
from server.models.user import User
from server.extensions import db

class SignUp(Resource):
    def post(self):
        data = request.get_json()
        
        if User.query.filter_by(email=data['email']).first():
            return {'error': 'Email already registered'}, 400
            
        if User.query.filter_by(username=data['username']).first():
            return {'error': 'Username already taken'}, 400
            
        user = User(
            username=data['username'],
            email=data['email']
        )
        user.set_password(data['password'])
        
        db.session.add(user)
        db.session.commit()
        
        user_dict = user.to_dict()
        print(f"New user created: {user.id} - {user.username}")
        print(f"User data returned: {user_dict}")
        return user_dict, 201

class Login(Resource):
    def post(self):
        data = request.get_json()
        user = User.query.filter_by(email=data['email']).first()
        
        if user and user.check_password(data['password']):
            user_dict = user.to_dict()
            print(f"User logged in: {user.id} - {user.username}")
            print(f"User data returned: {user_dict}")
            return user_dict, 200
            
        return {'error': 'Invalid email or password'}, 401

# Register routes
api.add_resource(SignUp, '/api/auth/signup')
api.add_resource(Login, '/api/auth/login')
