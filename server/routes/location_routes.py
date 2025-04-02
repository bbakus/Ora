from flask import request, jsonify
from flask_restful import Resource
from server.extensions import api
from server.models.location import Location
from server.extensions import db

class LocationList(Resource):
    def get(self):
        locations = Location.query.all()
        return [location.to_dict() for location in locations], 200

    def post(self):
        data = request.get_json()
        location = Location(
            name=data['name'],
            google_place_id=data['google_place_id'],
            latitude=data['latitude'],
            longitude=data['longitude'],
            place_type=data['place_type'],
            address=data.get('address'),
            rating=data.get('rating')
        )
        db.session.add(location)
        db.session.commit()
        return location.to_dict(), 201

class LocationById(Resource):
    def get(self, location_id):
        location = Location.query.get_or_404(location_id)
        return location.to_dict(), 200

    def patch(self, location_id):
        location = Location.query.get_or_404(location_id)
        data = request.get_json()
        
        for field in ['name', 'google_place_id', 'latitude', 'longitude', 'place_type', 'address', 'rating']:
            if field in data:
                setattr(location, field, data[field])
        
        db.session.commit()
        return location.to_dict(), 200

    def delete(self, location_id):
        location = Location.query.get_or_404(location_id)
        db.session.delete(location)
        db.session.commit()
        return '', 204

# Register routes
api.add_resource(LocationList, '/api/locations')
api.add_resource(LocationById, '/api/locations/<int:location_id>')
