import traceback
try:
    from app import create_app
    app = create_app()
except Exception as e:
    print(traceback.format_exc())
    raise