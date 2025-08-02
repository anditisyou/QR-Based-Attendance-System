//Validates student’s classroom proximity.
public class Haversine {
    private static final double EARTH_RADIUS = 6371000; // meters

    private static double toRadians(double degrees) {
        return degrees * Math.PI / 180;
    }

    public static double calculateDistance(double lat1, double lng1, double lat2, double lng2) {
        double dLat = toRadians(lat2 - lat1);
        double dLng = toRadians(lng2 - lng1);
        
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                   Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
                   Math.sin(dLng / 2) * Math.sin(dLng / 2);
        
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        
        return EARTH_RADIUS * c;
    }

    public static void main(String[] args) {
        if (args.length != 4) {
            System.err.println("Usage: java Haversine <lat1> <lng1> <lat2> <lng2>");
            System.exit(1);
        }
        
        try {
            double lat1 = Double.parseDouble(args[0]);
            double lng1 = Double.parseDouble(args[1]);
            double lat2 = Double.parseDouble(args[2]);
            double lng2 = Double.parseDouble(args[3]);
            
            double distance = calculateDistance(lat1, lng1, lat2, lng2);
            System.out.println(distance);
        } catch (NumberFormatException e) {
            System.err.println("Error: All arguments must be numbers");
            System.exit(1);
        }
    }
}