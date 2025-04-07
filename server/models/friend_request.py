from datetime import datetime
from server.extensions import db

class FriendRequest(db.Model):
    """
    Model for friend requests between users
    """
    __tablename__ = 'friend_requests'
    
    id = db.Column(db.Integer, primary_key=True)
    sender_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    receiver_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    status = db.Column(db.String(20), default='pending')  # 'pending', 'accepted', 'rejected'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    sender = db.relationship('User', foreign_keys=[sender_id], backref=db.backref('sent_requests', lazy='dynamic'))
    receiver = db.relationship('User', foreign_keys=[receiver_id], backref=db.backref('received_requests', lazy='dynamic'))
    
    def __repr__(self):
        return f'<FriendRequest {self.id}: {self.sender_id} -> {self.receiver_id} ({self.status})>'
    
    def to_dict(self):
        """Convert to dictionary for API responses"""
        return {
            'id': self.id,
            'sender_id': self.sender_id,
            'receiver_id': self.receiver_id,
            'status': self.status,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        } 