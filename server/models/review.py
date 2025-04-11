from server.extensions import db
from . import BaseModel
from sqlalchemy import ForeignKey
from sqlalchemy.orm import validates


class Review(BaseModel):

    __tablename__='reviews'

    body = db.Column(db.String(5000), nullable=False)
    rating = db.Column(db.Integer, nullable=False)
    user_id = db.Column(db.Integer, ForeignKey('users.id'))
    location_id = db.Column(db.Integer, ForeignKey('locations.id'))

    user = db.relationship('User', back_populates='reviews')
    location = db.relationship('Location', back_populates='reviews')
    
  

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
