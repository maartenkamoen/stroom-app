# Stroom-app

Een oefensite voor rekenen aan elektriciteit op vwo-eindexamenniveau (natuurkunde): de formules
voor stroom, spanning, weerstand, vermogen, energie en lading, en rekenen met hun eenheden en
voorvoegsels (mA, kΩ, kWh, mm², …).

Onderwerpen: wet van Ohm, vermogen, energie en kWh, lading, serie-, parallel- en gemengde
schakelingen, geleidbaarheid, soortelijke weerstand, rendement, transformator, eenheden omrekenen
en formules omschrijven/eenheden afleiden (meerkeuze). Er is ook een mix-modus en een formulekaart.

Elke vraag bestaat uit *gegeven* en *gevraagd* (met de eenheid waarin het antwoord moet). Na het
antwoorden verschijnt een uitwerking: omrekenen naar de basiseenheid → formule (omschrijven) →
invullen → omrekenen naar de gevraagde eenheid. Antwoorden mogen 2% afwijken (afronden op 2
significante cijfers mag ook). Het niveau bepaalt hoeveel voorvoegsels en rekenstappen er zijn.

Plain HTML/CSS/JS, puur client-side (geen backend/database), draait in Kubernetes achter nginx.

## Lokaal bekijken

Open `index.html` direct in de browser, of serveer de map lokaal, bv.:

```
python3 -m http.server 8080
```

## Container image bouwen en pushen

Gebeurt automatisch via GitHub Actions (`.github/workflows/build-push.yaml`) bij elke push naar
`main`: de image wordt gebouwd en gepusht naar `maartenkamoen/private:stroom-app-latest` (en een
tag per commit-sha). Vereist de repository secrets `DOCKERHUB_USERNAME` en `DOCKERHUB_TOKEN`.

Lokaal handmatig bouwen kan ook:

```
docker build -t maartenkamoen/private:stroom-app-latest .
docker push maartenkamoen/private:stroom-app-latest
```

## Deployen naar Kubernetes

De manifesten in `k8s/` worden uitgerold door ArgoCD (buiten deze codebase). Ze verwachten:
- Een reeds bestaande Gateway `cilium-external` in namespace `kube-system` (Gateway API).
- Een `imagePullSecret` genaamd `dockerhub` in namespace `stroom-app`, omdat `maartenkamoen/private`
  een privé Docker Hub repository is. Deze secret valt buiten deze codebase (door ArgoCD/beheerder
  aan te maken), bijvoorbeeld:

```
kubectl create secret docker-registry dockerhub \
  --namespace stroom-app \
  --docker-server=https://index.docker.io/v1/ \
  --docker-username=<jouw-dockerhub-username> \
  --docker-password=<jouw-dockerhub-token>
```

De app is daarna bereikbaar via `https://stroom.multiflex.io`.
