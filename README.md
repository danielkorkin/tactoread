# TactoRead

Turn molecules, proteins, cell images, western blots, and data into models you can print and pass around the room.

## Authors

- [@danielkorkin](https://www.github.com/danielkorkin)
- [@p0syd0n](https://github.com/p0syd0n)

## Demo

The live production app can be found at [tactoread.org](https://tactoread.org)

## Installation

Install TactoRead with pnpm

```bash
  pnpm install
```

Then to install python requirements

```bash
cd api/
pip install -r requirements.txt
```

## Environment Variables

To run this project, you will need to add the following environment variables to your .env file

`OPENAI_API_KEY`

## Run Locally

Clone the project

```bash
  git clone https://github.com/danielkorkin/tactoread
```

Go to the project directory

```bash
  cd tactoread
```

Install dependencies

```bash
  pnpm install
  cd api/
  pip install -r requirements.txt
```

Start the server

```bash
  npm run dev
  cd api/
  python3 index.py
```

## Deployment

To deploy this project run

```bash
  npm run build
  npm run start
```

Then to deploy the api run

```bash
gunicorn index:app --bind 0.0.0.0:$PORT --workers 2 --timeout 120
```

## License

[MIT](https://choosealicense.com/licenses/mit/)

## Acknowledgements

- [Universal pictures: A lithophane codex helps teenagers with blindness visualize nanoscopic systems](https://doi.org/10.1126/sciadv.adj8099)
