from server.extensions import db
from . import BaseModel
from sqlalchemy import ForeignKey
from sqlalchemy.orm import validates


class Review(BaseModel):

    __tablename__='reviews'

    body = db.Column(db.String(1000), nullable=False)
    rating = db.Column(db.Integer, nullable=False)
    user_id = db.Column(db.Integer, ForeignKey('users.id'))
    location_id = db.Column(db.Integer, ForeignKey('locations.id'))

    user = db.relationship('User', back_populates='reviews')
    location = db.relationship('Location', back_populates='reviews')
    
    @validates('body')
    def validate_body(self, key, body):
        if not body:
            raise ValueError('Review body cannot be empty')
        if len(body) < 10:
            raise ValueError('Review body must be at least 10 characters')
        if len(body) > 1000:
            raise ValueError('Review body cannot exceed 1000 characters')
        return body
    
    @validates('rating')
    def validate_rating(self, key, rating):
        if not isinstance(rating, int):
            raise ValueError('Rating must be an integer')
        if not 1 <= rating <= 5:
            raise ValueError('Rating must be between 1 and 5')
        return rating
    
    @validates('user_id', 'location_id')
    def validate_ids(self, key, value):
        if not value:
            raise ValueError(f'{key} cannot be empty')
        return value

    def to_dict(self):
        """Convert review to dictionary for JSON response"""
        return {
            'id': self.id,
            'body': self.body,
            'rating': self.rating,
            'user_id': self.user_id,
            'location_id': self.location_id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'user': self.user.to_dict() if self.user else None,
            'location': self.location.to_dict() if self.location else None
        }
