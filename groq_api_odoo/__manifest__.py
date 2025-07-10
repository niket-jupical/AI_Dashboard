{
    'name': 'Groq AI and Odoo Integration',
    'version': '17.0.1.0.0',
    'summary': 'Integrate Groq AI to answer Odoo module-related questions',
    'author': 'Jupical',
    'depends': ['base'],
    'data': [
        'security/ir.model.access.csv',
        'views/groq_prompt_view.xml',
        'views/menu.xml',
        
    ],
   
    'assets': {
        
        'web.assets_backend': [
           'groq_api_odoo/static/src/js/groq_dashboard.js',
           'groq_api_odoo/static/src/xml/dashboard.xml',
        ],
    },
    'installable': True,
    'application': True,
}