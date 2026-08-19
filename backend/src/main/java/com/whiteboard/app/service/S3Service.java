package com.whiteboard.app.service;

import com.amazonaws.auth.DefaultAWSCredentialsProviderChain;
import com.amazonaws.services.s3.AmazonS3;
import com.amazonaws.services.s3.AmazonS3ClientBuilder;
import com.amazonaws.services.s3.model.AmazonS3Exception;
import com.amazonaws.services.s3.model.CannedAccessControlList;
import com.amazonaws.services.s3.model.ObjectMetadata;
import com.amazonaws.services.s3.model.S3Object;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.Base64;

//uploads/downloads board snapshots to S3, creds picked up from env vars / IAM role automatically
@Service
public class S3Service
{
    @Value("${aws.s3.bucket}")
    private String bucket;

    @Value("${aws.region}")
    private String region;

    private AmazonS3 client()
    {
        return AmazonS3ClientBuilder.standard()
                .withRegion(region)
                .withCredentials(new DefaultAWSCredentialsProviderChain())
                .build();
    }

    //one deterministic key per room -- gets overwritten on every save, not a new file each time
    private String keyFor(String roomId)
    {
        return "boards/" + roomId + ".png";
    }

    //accepts a data URL like "data:image/png;base64,...." and returns the S3 key it landed at
    public String uploadBoardImage(String roomId, String dataUrl)
    {
        String base64Payload = dataUrl.substring(dataUrl.indexOf(',') + 1);
        byte[] bytes = Base64.getDecoder().decode(base64Payload);
        String key = keyFor(roomId);

        ObjectMetadata metadata = new ObjectMetadata();
        metadata.setContentType("image/png");
        metadata.setContentLength(bytes.length);

        AmazonS3 s3 = client();
        s3.putObject(bucket, key, new ByteArrayInputStream(bytes), metadata);
        s3.setObjectAcl(bucket, key, CannedAccessControlList.PublicRead);      //so the "View saved" link actually works

        return key;
    }

    //raw PNG bytes for a room's last save, or null if nothing's been saved yet
    public byte[] downloadBoardImage(String roomId) throws IOException
    {
        try
        {
            S3Object object = client().getObject(bucket, keyFor(roomId));
            return object.getObjectContent().readAllBytes();
        }
        catch (AmazonS3Exception e)
        {
            if (e.getStatusCode() == 404) return null;      //no snapshot for this room yet, not an error
            throw e;
        }
    }
}
