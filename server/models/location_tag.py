from server.extensions import db
from sqlalchemy import ForeignKey

# Association table for Location-Tag many-to-many relationship
location_tags = db.Table('location_tags',
    db.Column('location_id', db.Integer, ForeignKey('locations.id')),
    db.Column('tag_id', db.Integer, ForeignKey('tags.id')),
    extend_existing=True
) 