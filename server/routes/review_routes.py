from flask import request, jsonify
from flask_restful import Resource
from server.extensions import api
from server.models.review import Review
from server.extensions import db

class ReviewList(Resource):
    def get(self):
        reviews = Review.query.all()
        return [review.to_dict() for review in reviews], 200

    def post(self):
        data = request.get_json()
        review = Review(
            body=data['body'],
            user_id=data['user_id'],
            location_id=data['location_id']
        )
        db.session.add(review)
        db.session.commit()
        return review.to_dict(), 201

class ReviewById(Resource):
    def get(self, review_id):
        review = Review.query.get_or_404(review_id)
        return review.to_dict(), 200

    def patch(self, review_id):
        review = Review.query.get_or_404(review_id)
        data = request.get_json()
        
        if 'body' in data:
            review.body = data['body']
        
        db.session.commit()
        return review.to_dict(), 200

    def delete(self, review_id):
        review = Review.query.get_or_404(review_id)
        db.session.delete(review)
        db.session.commit()
        return '', 204

# Register routes
def register_resources(api):
    api.add_resource(ReviewList, '/api/reviews')
    api.add_resource(ReviewById, '/api/reviews/<int:review_id>')
