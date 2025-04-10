from flask import request, jsonify
from flask_restful import Resource
from server.extensions import api
import os
from openai import OpenAI
from datetime import datetime
import json
from server.models.user import User
from server.extensions import db

# Configure OpenAI API key
openai_api_key = os.environ.get("OPENAI_API_KEY", "").strip()
if not openai_api_key:
    raise ValueError("OpenAI API key is not set in environment variables")

# Log API key first few chars for debugging
api_key_preview = openai_api_key[:10] + "..." if len(openai_api_key) > 10 else "invalid_key"
print(f"OpenAI API key configured: {api_key_preview}")
print(f"OpenAI API key length: {len(openai_api_key)} characters")

try:
    # Initialize the OpenAI client with increased timeout
    client = OpenAI(api_key=openai_api_key.strip(), timeout=60.0)  # Increase timeout to 60 seconds
    # Test the API key with a simple call
    models = client.models.list()
    print(f"OpenAI API connection successful. Available models: {len(models.data)}")
except Exception as e:
    print(f"ERROR: Could not initialize OpenAI client: {str(e)}")
    print("This may indicate an invalid API key or network issue")
    # Still create the client, we'll handle errors in the API calls
    client = OpenAI(api_key=openai_api_key, timeout=60.0)

class DailyMoodQuestionnaire(Resource):

    def post(self, user_id):
        """Generate six personalized mood questions for the user, using their base aura as a template to gauge"""
        try:
            data = request.get_json()
            current_date = datetime.now().strftime("%A, %B %d")

            print(f"Generating mood questions for user {user_id} on {current_date}")

            # Get the user's aura (if available) to customize questions
            user = db.session.get(User, user_id)
            main_color = user.aura_color if user and user.aura_color else "BLUE"
            
            # Create the prompt for GPT
            prompt = f"""
You are generating a 6-question daily mood check-in for a spiritual location-based app called Ora. The user's current aura is: {main_color}.

Your role is to create questions that quietly interpret someone's present energy and mental landscape without directly mentioning emotions or feelings.

🧠 GOAL:
Help the user express their current vibe through metaphor, sensory choices, and subtle preferences. The questions should reveal mood indirectly, like a poetic personality quiz.

🪄 RULES:
1. You MUST return EXACTLY 6 questions.
2. Each question MUST have exactly 3 multiple choice options.
3. Each option MUST be tagged secretly with one of these colors: RED, ORANGE, YELLOW, GREEN, BLUE, PURPLE, CYAN. No other colors are allowed.
4. DO NOT hint at the color name in the answer text.
5. DO NOT reuse the same question structure or sentence starter.
6. DO NOT use words like "emotions", "feelings", or "mood."
7. Prioritize sensory, symbolic, spatial, or narrative language.
8. EVERY QUESTION SHOULD BE UNIQUE EVERY TIME.

🖋 EXAMPLE QUESTION:
- Question: "Which kind of space pulls you in today?"
- "A glowing hallway filled with echoes" → PURPLE
- "A mossy clearing with gentle light" → GREEN
- "A crowded plaza under warm sun" → ORANGE

🎨 Answer choices should align with these color themes:

- RED: high energy, movement, urgency, passion
- ORANGE: warmth, familiarity, comfort, nostalgia
- YELLOW: curiosity, authenticity, traditional, ethnic, openness
- GREEN: groundedness, casual, easy-going, relaxed
- BLUE: calm, distance, thoughtfulness, silence, quiet, space
- PURPLE: elegance, formal, dignified, royal, expensive
- CYAN: novelty, change, modern, unique, refreshing

📦 RESPONSE FORMAT:
Return only valid JSON with an array of question objects. Do not include explanations, intros, or markdown. Use this structure:

[
{{
    "question": "Your question text here?",
    "options": [
    {{ "text": "Option 1 text", "color": "COLOR_NAME" }},
    {{ "text": "Option 2 text", "color": "COLOR_NAME" }},
    {{ "text": "Option 3 text", "color": "COLOR_NAME" }}
    ]
}},
{{
    "question": "Second question text?",
    "options": [
    {{ "text": "Option 1 text", "color": "COLOR_NAME" }},
    {{ "text": "Option 2 text", "color": "COLOR_NAME" }},
    {{ "text": "Option 3 text", "color": "COLOR_NAME" }}
    ]
}},
... and 4 more question objects to make exactly 6 questions total
]
"""

            # Implement a retry mechanism for OpenAI API
            max_retries = 3
            retry_count = 0
            backoff_time = 1  # Initial backoff time in seconds
            
            while retry_count < max_retries:
                try:
                    print(f"Attempt {retry_count + 1} to call OpenAI API")
                    
                    # Call OpenAI API with increased token limit
                    response = client.chat.completions.create(
                        model="gpt-3.5-turbo-1106",  # Use the latest version that's good with JSON
                        messages=[
                            {"role": "system", "content": "You are a helpful assistant that generates thoughtful mood questions with associated color values. Always return a JSON array of question objects exactly as specified."},
                            {"role": "user", "content": prompt}
                        ],
                        temperature=0.7,
                        max_tokens=1500,  # Increase token limit further
                        # Remove the response_format parameter - we want an array, not an object
                    )
                    
                    questions_text = response.choices[0].message.content
                    print(f"Raw OpenAI response: {questions_text}")
                    
                    # Break out of retry loop if successful
                    break
                    
                except Exception as api_err:
                    retry_count += 1
                    print(f"OpenAI API call failed (attempt {retry_count}): {str(api_err)}")
                    
                    if retry_count >= max_retries:
                        print("Max retries reached, failing")
                        raise
                    
                    # Exponential backoff
                    import time
                    sleep_time = backoff_time * (2 ** (retry_count - 1))
                    print(f"Retrying in {sleep_time} seconds...")
                    time.sleep(sleep_time)

            # Clean up markdown formatting (in case JSON is returned within code blocks)
            if "```json" in questions_text:
                questions_text = questions_text.split("```json")[1].split("```")[0].strip()
            elif "```" in questions_text:
                questions_text = questions_text.split("```")[1].split("```")[0].strip()
            
            # Additional cleanup - remove any leading/trailing brackets if they exist
            questions_text = questions_text.strip()
            
            print(f"Cleaned text (first 100 chars): {questions_text[:100]}...")
            
            # Try to parse JSON with better error handling
            try:
                # First try to parse as is
                try:
                    parsed_json = json.loads(questions_text)
                except json.JSONDecodeError as e:
                    # If that fails, try to fix common issues
                    print(f"Initial JSON parsing failed: {str(e)}")
                    
                    # Try adding [] if missing - common GPT mistake
                    if not questions_text.startswith('['):
                        questions_text = '[' + questions_text
                    if not questions_text.endswith(']'):
                        questions_text = questions_text + ']'
                    
                    # Replace single quotes with double quotes if needed
                    questions_text = questions_text.replace("'", '"')
                    
                    # Try parsing again
                    print("Attempting to parse with fixes...")
                    parsed_json = json.loads(questions_text)
                    print("Parse successful after fixes")
                
                # Handle the response format
                if isinstance(parsed_json, list):
                    # Direct array of questions - what we want
                    parsed_questions = parsed_json
                elif isinstance(parsed_json, dict):
                    # Check if it's a JSON object with a "questions" field
                    if "questions" in parsed_json:
                        parsed_questions = parsed_json["questions"]
                    else:
                        # Single question object? Put it in an array
                        parsed_questions = [parsed_json]
                else:
                    raise ValueError(f"Unexpected JSON structure: {type(parsed_json)}")
                
                print(f"Successfully parsed questions: {len(parsed_questions)} questions found")
                
                # Validate the structure and make sure each question has color tags
                valid = True
                
                # Check if we have questions
                if not parsed_questions or len(parsed_questions) == 0:
                    print("No questions found in parsed data")
                    valid = False
                
                # Attempt to fix or create missing questions if needed
                if len(parsed_questions) < 6:
                    print(f"Only {len(parsed_questions)} questions found, expected 6. Will use what we have.")
                
                # Validate and fix each question
                for i, question in enumerate(parsed_questions):
                    if not isinstance(question, dict):
                        print(f"Question {i} is not a dictionary: {question}")
                        valid = False
                        continue
                        
                    # Check/fix required fields
                    if "question" not in question:
                        print(f"Question {i} missing 'question' field")
                        question["question"] = f"Question {i+1}?"
                        
                    if "options" not in question:
                        print(f"Question {i} missing 'options' field")
                        question["options"] = [
                            {"text": "Option A", "color": "BLUE"},
                            {"text": "Option B", "color": "GREEN"},
                            {"text": "Option C", "color": "RED"}
                        ]
                    
                    # Fix/validate options
                    if not isinstance(question["options"], list):
                        print(f"Question {i} options is not a list")
                        question["options"] = [
                            {"text": "Option A", "color": "BLUE"},
                            {"text": "Option B", "color": "GREEN"},
                            {"text": "Option C", "color": "RED"}
                        ]
                    
                    # Ensure we have exactly 3 options
                    options = question["options"]
                    while len(options) < 3:
                        print(f"Question {i} has only {len(options)} options, adding default option")
                        options.append({"text": f"Option {len(options)+1}", "color": "BLUE"})
                    
                    # Truncate extra options
                    if len(options) > 3:
                        print(f"Question {i} has {len(options)} options, truncating to 3")
                        question["options"] = options[:3]
                    
                    # Validate each option has text and color
                    for j, option in enumerate(question["options"]):
                        if not isinstance(option, dict):
                            print(f"Question {i}, Option {j} is not a dictionary: {option}")
                            question["options"][j] = {"text": f"Option {j+1}", "color": "BLUE"}
                            continue
                            
                        if "text" not in option:
                            print(f"Question {i}, Option {j} missing 'text' field")
                            option["text"] = f"Option {j+1}"
                            
                        if "color" not in option:
                            print(f"Question {i}, Option {j} missing 'color' field")
                            option["color"] = "BLUE"
                            
                        # Validate color is one of the allowed values
                        valid_colors = ["RED", "ORANGE", "YELLOW", "GREEN", "BLUE", "PURPLE", "CYAN"]
                        if option["color"] not in valid_colors:
                            print(f"Question {i}, Option {j} has invalid color: {option['color']}")
                            option["color"] = "BLUE"  # Default to blue for invalid colors
                
                # Return what we have, even if not perfect
                print(f"Returning {len(parsed_questions)} questions")
                return {
                    "status": "success",
                    "questions": parsed_questions,
                    "user_id": user_id
                }, 200
                
            except Exception as e:
                print(f"Fatal error parsing questions: {str(e)}")
                print(f"Raw text (truncated): {questions_text[:200]}...")
                import traceback
                traceback.print_exc()
                raise ValueError(f"Failed to parse or validate questions: {str(e)}")
                
        except Exception as e:
            print(f"Error generating mood questions: {str(e)}")
            import traceback
            traceback.print_exc()  # Print full stack trace for better debugging
            return {
                "status": "error",
                "message": f"Failed to generate mood questions: {str(e)}",
                "user_id": user_id
            }, 500


class AnalyzeMoodResponse(Resource):
    def post(self, user_id):
        """Analyze user's responses to mood questions and determine aura adjustments"""
        try:
            data = request.get_json()
            questions = data.get('questions', [])
            responses = data.get('responses', [])
            # Get client-determined shape if available (based on response times)
            client_shape = data.get('aura_shape')
            
            print(f"Analyzing mood responses for user {user_id}")
            print(f"Questions: {len(questions)} received")
            print(f"Responses: {len(responses)} received")
            print(f"Client determined shape: {client_shape}")
            
            if not questions or not responses or len(questions) != len(responses):
                return {
                    "status": "error",
                    "message": "Invalid questions or responses provided",
                    "user_id": user_id
                }, 400
            
            # Extract color values from responses
            color_values = []
            try:
                # Determine how the responses are structured
                for i, response in enumerate(responses):
                    # If responses are just the text values, match them to the options
                    question = questions[i]
                    if isinstance(question, dict) and "options" in question:
                        # Find the selected option
                        matched_option = None
                        for option in question["options"]:
                            if isinstance(option, dict) and "text" in option and option["text"] == response:
                                matched_option = option
                                break
                            
                        # If option found and it has a color, add it
                        if matched_option and "color" in matched_option:
                            color_values.append(matched_option["color"])
                    
                print(f"Extracted color values: {color_values}")
            
                # Count frequency of each color
                color_counts = {}
                for color in color_values:
                    if color in color_counts:
                        color_counts[color] += 1
                    else:
                        color_counts[color] = 1
                
                print(f"Color counts: {color_counts}")
                
                # Determine dominant colors (top 3)
                sorted_colors = sorted(color_counts.items(), key=lambda x: x[1], reverse=True)
                top_colors = sorted_colors[:3] if len(sorted_colors) >= 3 else sorted_colors
                
                print(f"Top colors: {top_colors}")
                
                # Map colors to hex values - UPDATED to match AuraQuestionnaire.js
                color_hex_map = {
                    "RED": "#FF0000",     # energy
                    "ORANGE": "#FFA500",  # warmth
                    "YELLOW": "#FFFF00",  # using standard yellow (added)
                    "GREEN": "#00FF00",   # casual
                    "BLUE": "#0000FF",    # calmness
                    "PURPLE": "#800080",  # elegance
                    "CYAN": "#00FFFF"     # freshness
                }
                
                # Create a gradient based on top colors
                aura_colors = []
                default_colors = ["#2196F3", "#00BCD4", "#4CAF50"]  # Default blue-cyan-green
                
                for i in range(min(3, len(top_colors))):
                    color_name = top_colors[i][0]
                    if color_name in color_hex_map:
                        aura_colors.append(color_hex_map[color_name])
                
                # Fill in with defaults if needed
                while len(aura_colors) < 3:
                    aura_colors.append(default_colors[len(aura_colors)])
                
                # Create the aura color gradient
                aura_color = f"linear-gradient(45deg, {aura_colors[0]}, {aura_colors[1]}, {aura_colors[2]})"
                print(f"Generated aura color: {aura_color}")
                
                # Use client-determined shape or fallback to balanced
                aura_shape = client_shape if client_shape in ["sparkling", "flowing", "pulsing", "balanced"] else "balanced"
                
                # Create analysis result
                analysis_result = {
                    "aura_color": aura_color, 
                    "aura_shape": aura_shape,
                    "mood_summary": "Your aura reflects your current state of being."
                }
                
                # Return analysis result
                return {
                    "status": "success",
                    "analysis": analysis_result,
                    "user_id": user_id
                }, 200
                
            except Exception as e:
                print(f"Error in color analysis: {str(e)}")
                import traceback
                traceback.print_exc()
                raise ValueError(f"Failed to analyze color values: {str(e)}")
            
        except Exception as e:
            print(f"Error analyzing mood responses: {str(e)}")
            import traceback
            traceback.print_exc()
            return {
                "status": "error",
                "message": f"Failed to analyze mood responses: {str(e)}",
                "user_id": user_id
            }, 500

# Register routes
def register_resources(api):
    api.add_resource(DailyMoodQuestionnaire, '/api/users/<user_id>/daily-mood/questions')
    api.add_resource(AnalyzeMoodResponse, '/api/users/<user_id>/daily-mood/analyze') 