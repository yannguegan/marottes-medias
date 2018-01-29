<html lang="fr">
<head>
<meta http-equiv="content-type" content="text/html; charset=utf-8">
</head>
<?php
/*
 * Converts CSV to JSON
 * Example uses Google Spreadsheet CSV feed
 * csvToArray function I think I found on php.net
 */

function array_sort_by_column(&$arr, $col, $dir = SORT_DESC) {
    $sort_col = array();
    foreach ($arr as $key=> $row) {
        $sort_col[$key] = $row[$col];
    }

    array_multisort($sort_col, $dir, $arr);
}

// Function to convert CSV into associative array
function csvToArray($file, $delimiter) { 
  if (($handle = fopen($file, 'r')) !== FALSE) { 
  $i = 0; 
  while (($lineArray = fgetcsv($handle, 4000, $delimiter, '"')) !== FALSE) { 
  for ($j = 0; $j < count($lineArray); $j++) { 
    $arr[$i][$j] = $lineArray[$j]; 
  } 
  $i++; 
  } 
  fclose($handle); 
  } 
return $arr; 
} 


echo '<pre><strong>Création du fichier JSON utilisé pour l’infographie "Marottes des médias"</strong></pre><br />';

// Boucle pour créer un fichier par onglet 
$gsheetid = '2PACX-1vRCRneQgBPS8tBMzYyqX3kwxeQMlWSVVzaSpbBYb3lC9HyW9sfzdBzKpkudXepPIvzU-boPUJv-lHI_';
$gsheetsectionid = [
  "media" => "0"
];
$jsonStuff = array();
foreach ($gsheetsectionid as $key => $value) {
    $feed = 'https://docs.google.com/spreadsheets/d/e/' . $gsheetid . '/pub?gid=' . $value . '&single=true&output=csv';

    // Arrays we'll use later
    $keys = array();
    $newArray = array();

    // Do it
    $data = csvToArray($feed, ',');

    // Set number of elements (minus 1 because we shift off the first row)
    $count = count($data) - 1;

    //Use first row for names  
    $labels = array_shift($data);  

    foreach ($labels as $label) {
      $keys[] = $label;
    }

    // Add Ids, just in case we want them later
    $keys[] = 'id';
 
    for ($i = 0; $i < $count; $i++) {
      $data[$i][] = $i;
    }

    // Bring it all together
    for ($j = 0; $j < $count; $j++) {
      $d = array_combine($keys, $data[$j]);
      $newArray[$j] = $d;
    }
    $jsonStuff[$key] = $newArray;
};    

// Saving file
$json_file = '../data.json';
$fp = fopen($json_file, 'w');
// header('Content-Type: application/json');
fwrite($fp, json_encode($jsonStuff, JSON_PRETTY_PRINT));

echo "<pre>";
echo 'Fichier <a href="' . $json_file . '">data.json</a> créé !';
echo "</pre>";
  
?>