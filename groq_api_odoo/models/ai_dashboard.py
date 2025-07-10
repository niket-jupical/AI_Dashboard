from odoo import models, fields, api
import requests
import os
import json
from dotenv import load_dotenv

load_dotenv()

class GroqPrompt(models.Model):
	_name = 'groq.prompt'
	_description = 'Groq AI Prompt'

	name = fields.Char("Prompt")
	response = fields.Text("Response")

	def fetch_groq_response(self, prompt):
		api_url = "https://api.groq.com/openai/v1/chat/completions"
		api_key = os.environ.get('api_key')

		headers = {
			"Authorization": f"Bearer {api_key}",
			"Content-Type": "application/json",
		}

		
		data = {
			"model": "llama-3.3-70b-versatile", 
			"messages": [
				{"role": "system", "content": "You are a helpful assistant."},
				{"role": "user", "content": prompt},
			],
			"tools": [
				{
					"type": "function",
					"function": {
						"name": "fetch_odoo_data",
						"description": "Fetch data from Odoo models dynamically.",
						"parameters": {
							"type": "object",
							"properties": {
								"model_name": {"type": "string", "description": "Odoo model name"},
								"fields": {"type": "array", "items": {"type": "string"}, "description": "Fields to retrieve"},
								"domain": {"type": "array", "items": {"type": "array"}, "description": "Domain filters"}
							},
							"required": ["model_name", "fields"]
						}
					}
				}
			],
			"tool_choice": "auto"
		}
		print("-----Data---------",data)
		try:
			response = requests.post(api_url, json=data, headers=headers)
			if response.status_code == 200:
				response_json = response.json()
				print("response_json-------------------------------", response_json)
				tool_calls = response_json.get("choices", [{}])[0].get("message", {}).get("tool_calls", [])
				print("==================tool_calls=========", tool_calls)
				if tool_calls:
					tool_arguments = tool_calls[0].get("function", {}).get("arguments", "{}")
					tool_data = json.loads(tool_arguments)
					model_name = tool_data.get("model_name")
					print("model============================", model_name)
					fields = tool_data.get("fields")
					print("fields###########################", fields)
					domain = tool_data.get("domain", [])
					print("domain-------------------------------", domain)
					odoo_data = self.fetch_odoo_data_from_model(model_name, fields, domain)
					print("=============odoo_data===================", odoo_data)
					if odoo_data:
						def get_display_value(val):
							try:
								if hasattr(val, "strip"):
									raise Exception("Value is a string")
								return str(val[1])
							except Exception:
								return str(val)
						formatted_response = "\n".join([
							", ".join([get_display_value(record[field]) for field in fields if field in record])
							for record in odoo_data
						])
						print("Formatted Response:", formatted_response)
						return formatted_response
					else:
						return "No data found in Odoo."
				else:
					return "No tool calls found in the response."
			else:
				return f"Error: {response.status_code} - {response.text}"
		except Exception as e:
			return f"Error: {str(e)}"

	def fetch_odoo_data_from_model(self, model_name, fields, domain):
		try:
			model_mapping = {
				"customers": "res.partner",  
			}
			model_name = model_mapping.get(model_name, model_name) 
			
			if model_name not in self.env:
				return f"Error: Model '{model_name}' not found in Odoo."

			if model_name == "res.partner":
				
				domain = [["customer_rank", ">=", 0]]

			model = self.env[model_name]
			records = model.search_read(domain, fields)
			return records
		except Exception as e:
			return f"Error fetching Odoo data: {str(e)}"


	def action_ask_groq(self):
		
		for record in self:
			if record.name:
				record.response = self.fetch_groq_response(record.name)
			else:
				record.response = "Please provide a valid prompt before asking Groq AI."

	@api.model
	def create(self, vals):
		prompt = vals.get("name")
		if prompt:
			response = self.fetch_groq_response(prompt)
			vals["response"] = response
		return super(GroqPrompt, self).create(vals)
