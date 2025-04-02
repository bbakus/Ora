from flask import request, jsonify
from flask_restful import Resource
from server.extensions import api
from server.models.collection import Collection
from server.extensions import db


class CollectionByID(Resource):
    
    def get(self, user_id):
        collections = Collection.query.filter_by(user_id=user_id).all()
        return [collection.to_dict() for collection in collections], 200




    def post(self, user_id):
        data = request.get_json()

        if data.get('user_id') != user_id:
            return {
                "error": "User ID mismatch. You can only create collections for yourself."
            }, 401

        collection = Collection(
            name=data['name'],
            user_id=user_id,
            is_base=data.get('is_base', False)
        )

        db.session.add(collection)
        db.session.commit()
        return collection.to_dict(), 201
    




    def patch(self, user_id, collection_id):
        collection = Collection.query.filter_by(id=collection_id, user_id=user_id).first_or_404()
        
        if collection.is_base:
            return {
                "error": "Cannot edit the base collection"
            }, 403

        data = request.get_json()
        if 'name' in data:
            collection.name = data['name']
        
        db.session.commit()
        return collection.to_dict(), 200

    def delete(self, user_id, collection_id):
        collection = Collection.query.filter_by(id=collection_id, user_id=user_id).first_or_404()
        
        if collection.is_base:
            return {
                "error": "Cannot delete the base collection"
            }, 403

        db.session.delete(collection)
        db.session.commit()
        return '', 204

# Register routes
api.add_resource(CollectionByID, '/api/users/<int:user_id>/collections', '/api/users/<int:user_id>/collections/<int:collection_id>')